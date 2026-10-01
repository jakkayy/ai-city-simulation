import asyncio
import logging
import random
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.models.citizen import Citizen, Zone
from app.models.event import Event
from app.models.snapshot import DailySnapshot
from app.simulation.city_events import maybe_city_event
from app.simulation.crisis import advisor_due, check_crisis, reset_advisor_cooldown
from app.simulation.economy import apply_economy_tick, apply_job_market
from app.simulation.happiness import apply_happiness_tick
from app.simulation.reports import build_report, load_report_context, spawn_narrative
from app.simulation.snapshots import apply_citizen_state, build_snapshot_data, citizen_state
from app.simulation.state import CityState, city_state
from app.simulation.zones import apply_migration_tick, get_zone_populations
import app.simulation.gateway as _gateway_module
from app.simulation.citizen_ai import run_citizen_ai_tick
from app.simulation.fallback import apply_fallback_tick
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

async def run_tick() -> bool:
    """Run one simulation day. Returns False if skipped (tick in progress / not running)."""
    if _tick_lock.locked():
        logger.warning("Tick skipped — previous tick still running")
        return False
    if not city_state.is_running:
        return False

    async with _tick_lock:
        async with AsyncSessionLocal() as db:
            await _do_tick(db)
    return True


def reset_loop_state() -> None:
    """Forget per-run bookkeeping (used when the city is reset)."""
    reset_advisor_cooldown()


def run_day(citizens: list[Citizen], state: CityState, sim_date: date) -> tuple[dict, list[dict]]:
    """
    Pure simulation step for one day (no database, no LLM): economy, job market,
    migration, happiness, random city events. Returns (economy_result, events).
    """
    economy_result = apply_economy_tick(citizens, state)
    job_events = apply_job_market(citizens)
    migration_events = apply_migration_tick(citizens, sim_date)
    apply_happiness_tick(citizens, state)
    events = economy_result.get("events", []) + job_events + migration_events
    city_event = maybe_city_event(state, citizens)
    if city_event:
        events.append(city_event)
    return economy_result, events


# ── internal tick logic ───────────────────────────────────────────────────

async def _do_tick(db: AsyncSession) -> None:
    replay = city_state.replay_mode

    # step 1 — apply buffered LLM updates from the previous tick (never in replay)
    import app.simulation.state as _state_module
    if _state_module._pending_updates and not replay:
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

    if replay:
        # replay runs on an in-memory copy and is seeded by the day, so it is repeatable
        random.seed(city_state.simulation_day)
        for c in citizens:
            saved = city_state.replay_state.get(str(c.id))
            if saved:
                apply_citizen_state(c, saved)

    sim_date = _EPOCH + timedelta(days=city_state.simulation_day)

    # steps 3–5 — economy, job market, migrations, happiness, random city events
    economy_result, all_events = run_day(citizens, city_state, sim_date)

    pops = get_zone_populations(citizens)
    avg_happiness = sum(c.happiness for c in citizens) / len(citizens)
    day_recorded = city_state.simulation_day
    crisis = check_crisis(avg_happiness)
    report = None   # replays are not recorded, so they have no report

    if replay:
        # replay never touches the database: remember the state in memory, discard ORM changes
        city_state.replay_state = {str(c.id): citizen_state(c) for c in citizens}
        city_state.simulation_day += 1
        db.expunge_all()   # detach: nothing is flushed, loaded values stay readable
        apply_fallback_tick(citizens, "")   # policy reactions are already part of the saved state
    else:
        # step 6 — persist events
        for ev in all_events:
            db.add(Event(
                simulation_day=day_recorded,
                citizen_id=ev.get("citizen_id"),
                event_type=ev["event_type"],
                narrative=ev["narrative"],
                happiness_delta=ev.get("happiness_delta", 0.0),
            ))

        # step 7 — end-of-day report, saved with the daily snapshot (including full citizen state, for replay)
        prev, enacted = await load_report_context(db, day_recorded)
        report = build_report(
            day=day_recorded,
            avg_happiness=avg_happiness,
            fund=city_state.city_fund,
            service_quality=city_state.service_quality,
            tax_rate=city_state.tax_rate,
            prev=prev,
            events=all_events,
            crisis=crisis,
            policies=enacted,
        )
        db.add(DailySnapshot(
            simulation_day=day_recorded,
            avg_happiness=avg_happiness,
            city_fund=city_state.city_fund,
            service_quality=city_state.service_quality,
            zone_a_pop=pops[Zone.A],
            zone_b_pop=pops[Zone.B],
            zone_c_pop=pops[Zone.C],
            total_tax_collected=economy_result["total_tax_collected"],
            llm_calls_used=0,
            snapshot_data={**build_snapshot_data(citizens), "report": report},
        ))

        city_state.simulation_day += 1
        await db.commit()

        # the LLM bulletin arrives later through the "report_narrative" event
        if _gateway_module.llm_gateway._keys:
            spawn_narrative(report, _gateway_module.llm_gateway, _emit)

        # step 8 — citizen reactions via LLM (rule-based fallback is used inside the gateway)
        if _gateway_module.llm_gateway._keys:
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

    if not replay and city_manager.should_run(city_state.simulation_day):
        proposal = await city_manager.run(agent_ctx, _gateway_module.llm_gateway)
        if proposal:
            await _emit("city_manager_proposal", proposal)

    if not replay and crisis in ("critical", "collapse") and advisor_due(city_state.simulation_day, crisis):
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
        "report": report,
    })

    logger.info(
        "Day %d | happiness=%.1f | fund=%.0f | sq=%.1f%s",
        city_state.simulation_day,
        avg_happiness,
        city_state.city_fund,
        city_state.service_quality,
        f" | CRISIS={crisis}" if crisis else "",
    )


# ── helpers ───────────────────────────────────────────────────────────────

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
