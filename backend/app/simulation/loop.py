import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.models.citizen import Citizen, Zone
from app.models.event import Event
from app.models.snapshot import DailySnapshot
from app.simulation.constants import CRISIS_THRESHOLDS, ZONE_HAPPINESS_MODIFIER
from app.simulation.economy import apply_economy_tick
from app.simulation.state import CityState, city_state, _pending_updates, queue_llm_update
from app.simulation.zones import apply_migration_tick, get_zone_populations
import app.simulation.gateway as _gateway_module
from app.simulation.citizen_ai import run_citizen_ai_tick
from app.simulation.agents import city_manager, policy_advisor

logger = logging.getLogger(__name__)

_tick_lock = asyncio.Lock()
_policy_lock = asyncio.Lock()

# injected by main.py so the loop can emit socket events
_sio = None

# simulation epoch — day 0 corresponds to this date
_EPOCH = date(2026, 1, 1)


def set_socket_server(sio) -> None:
    global _sio
    _sio = sio


async def _emit(event: str, data: dict) -> None:
    if _sio:
        await _sio.emit(event, data)


# ── public tick entry point ───────────────────────────────────────────────

async def run_tick() -> None:
    """Run one simulation day. Skips if a tick is already in progress."""
    if _tick_lock.locked():
        logger.warning("Tick skipped — previous tick still running")
        return
    if not city_state.is_running:
        return

    async with _tick_lock:
        async with AsyncSessionLocal() as db:
            await _do_tick(db)


# ── internal tick logic ───────────────────────────────────────────────────

async def _do_tick(db: AsyncSession) -> None:
    global _pending_updates

    # step 1 — apply buffered LLM updates from the previous tick
    import app.simulation.state as _state_module
    if _state_module._pending_updates:
        pending_copy = _state_module._pending_updates
        _state_module._pending_updates = {}
        result = await db.execute(select(Citizen))
        for citizen in result.scalars():
            updates = pending_copy.get(str(citizen.id))
            if updates:
                for field, value in updates.items():
                    setattr(citizen, field, value)
                citizen.pending_reaction = False
        await db.flush()

    # step 2 — load all citizens
    result = await db.execute(select(Citizen))
    citizens = list(result.scalars().all())
    if not citizens:
        logger.warning("No citizens in DB — skipping tick")
        return

    sim_date = _EPOCH + timedelta(days=city_state.simulation_day)

    # step 3 — economy: savings, tax, city fund, service quality
    economy_result = apply_economy_tick(citizens, city_state)

    # step 4 — migrations: zone moves and waitlists
    migration_events = apply_migration_tick(citizens, sim_date)

    # step 5 — happiness drift: zone modifier + service quality influence
    for c in citizens:
        zone_mod = ZONE_HAPPINESS_MODIFIER[c.zone]
        sq_effect = (city_state.service_quality - 50.0) / 50.0 * 2.0
        c.happiness = max(0.0, min(100.0, c.happiness + zone_mod * 0.1 + sq_effect))
        c.days_unhappy = (c.days_unhappy + 1) if c.happiness < 40.0 else 0

    # step 6 — persist events
    all_events = economy_result.get("events", []) + migration_events
    for ev in all_events:
        db.add(Event(
            simulation_day=city_state.simulation_day,
            citizen_id=ev.get("citizen_id"),
            event_type=ev["event_type"],
            narrative=ev["narrative"],
            happiness_delta=ev.get("happiness_delta", 0.0),
        ))

    # step 7 — save daily snapshot
    pops = get_zone_populations(citizens)
    avg_happiness = sum(c.happiness for c in citizens) / len(citizens)

    db.add(DailySnapshot(
        simulation_day=city_state.simulation_day,
        avg_happiness=avg_happiness,
        city_fund=city_state.city_fund,
        service_quality=city_state.service_quality,
        zone_a_pop=pops[Zone.A],
        zone_b_pop=pops[Zone.B],
        zone_c_pop=pops[Zone.C],
        total_tax_collected=economy_result["total_tax_collected"],
        llm_calls_used=0,
    ))

    city_state.simulation_day += 1
    await db.commit()

    # step 8 — fire citizen AI (non-blocking; results applied next tick)
    if not city_state.replay_mode and _gateway_module.llm_gateway._keys:
        ctx = {
            "day": city_state.simulation_day,
            "avg_happiness": avg_happiness,
            "city_fund": city_state.city_fund,
            "service_quality": city_state.service_quality,
            "tax_rate": city_state.tax_rate,
            "recent_policy": city_state.recent_policy,
        }
        await run_citizen_ai_tick(citizens, ctx, _gateway_module.llm_gateway)

    # step 9 — City Manager (every 7 days) and Policy Advisor (on crisis)
    crisis = _check_crisis(avg_happiness)
    agent_ctx = {
        "day": city_state.simulation_day,
        "avg_happiness": avg_happiness,
        "city_fund": city_state.city_fund,
        "service_quality": city_state.service_quality,
        "tax_rate": city_state.tax_rate,
        "zone_a": pops[Zone.A],
        "zone_b": pops[Zone.B],
        "zone_c": pops[Zone.C],
        "recent_policy": city_state.recent_policy,
    }

    if city_manager.should_run(city_state.simulation_day):
        proposal = await city_manager.run(agent_ctx, _gateway_module.llm_gateway)
        if proposal:
            await _emit("city_manager_proposal", proposal)

    if crisis in ("critical", "collapse"):
        advice = await policy_advisor.advise(crisis, agent_ctx, _gateway_module.llm_gateway)
        await _emit("advisor_message", {"crisis_level": crisis, "advice": advice})

    # step 10 — broadcast tick
    await _emit("tick", {
        "day": city_state.simulation_day,
        "avg_happiness": round(avg_happiness, 2),
        "city_fund": round(city_state.city_fund, 2),
        "service_quality": round(city_state.service_quality, 2),
        "tax_rate": city_state.tax_rate,
        "crisis_level": crisis,
        "zone_populations": {z.value: n for z, n in pops.items()},
        "citizens": [_citizen_dict(c) for c in citizens],
        "events": all_events,
    })

    logger.info(
        "Day %d | happiness=%.1f | fund=%.0f | sq=%.1f%s",
        city_state.simulation_day,
        avg_happiness,
        city_state.city_fund,
        city_state.service_quality,
        f" | CRISIS={crisis}" if crisis else "",
    )


# ── startup restore ───────────────────────────────────────────────────────

async def restore_from_snapshot() -> None:
    """On server startup: resume from the latest saved snapshot."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DailySnapshot)
            .order_by(DailySnapshot.simulation_day.desc())
            .limit(1)
        )
        snap = result.scalar_one_or_none()
        if snap:
            city_state.simulation_day = snap.simulation_day + 1
            city_state.city_fund = snap.city_fund
            city_state.service_quality = snap.service_quality
            logger.info("Resumed from snapshot: day %d", city_state.simulation_day)
        else:
            logger.info("No snapshot — starting fresh from day 0")


# ── helpers ───────────────────────────────────────────────────────────────

def _check_crisis(avg_happiness: float) -> str | None:
    if avg_happiness <= CRISIS_THRESHOLDS["collapse"]:
        return "collapse"
    if avg_happiness <= CRISIS_THRESHOLDS["critical"]:
        return "critical"
    if avg_happiness <= CRISIS_THRESHOLDS["warning"]:
        return "warning"
    return None


def _citizen_dict(c: Citizen) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "zone": c.zone.value,
        "happiness": round(c.happiness, 1),
        "savings": round(c.savings, 2),
        "job_type": c.job_type.value,
        "last_action": c.last_action,
        "pending_reaction": c.pending_reaction,
    }
