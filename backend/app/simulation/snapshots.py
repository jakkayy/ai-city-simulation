"""
Saving and restoring the city: the per-day snapshot written by the tick loop (including the
full citizen state, which makes replays exact) and the resume-on-startup logic.
"""

import logging
from datetime import date

from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.citizen import Citizen, JobType, Zone
from app.models.snapshot import DailySnapshot
from app.simulation.state import city_state

logger = logging.getLogger(__name__)

# ── (de)serialisation ─────────────────────────────────────────────────────

_CITIZEN_FIELDS = ("happiness", "savings", "days_unhappy", "last_action")


def citizen_state(c: Citizen) -> dict:
    data = {f: getattr(c, f) for f in _CITIZEN_FIELDS}
    data["zone"] = c.zone.value
    data["job_type"] = c.job_type.value
    data["zone_locked_until"] = c.zone_locked_until.isoformat() if c.zone_locked_until else None
    return data


def apply_citizen_state(c: Citizen, data: dict) -> None:
    for f in _CITIZEN_FIELDS:
        setattr(c, f, data[f])
    c.zone = Zone(data["zone"])
    c.job_type = JobType(data["job_type"])
    c.zone_locked_until = date.fromisoformat(data["zone_locked_until"]) if data["zone_locked_until"] else None


def build_snapshot_data(citizens: list[Citizen]) -> dict:
    return {
        "version": 1,
        "city": {
            "tax_rate": city_state.tax_rate,
            "recent_policy": city_state.recent_policy,
            "income_modifier": city_state.income_modifier,
            "modifier_days": city_state.modifier_days,
        },
        "citizens": {str(c.id): citizen_state(c) for c in citizens},
    }


def restore_city_from_data(data: dict) -> None:
    city = (data or {}).get("city") or {}
    city_state.tax_rate = city.get("tax_rate", city_state.tax_rate)
    city_state.recent_policy = city.get("recent_policy", city_state.recent_policy)
    city_state.income_modifier = city.get("income_modifier", 1.0)
    city_state.modifier_days = city.get("modifier_days", 0)


# ── resume on startup ─────────────────────────────────────────────────────

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
            restore_city_from_data(snap.snapshot_data)
            logger.info("Resumed from snapshot: day %d", city_state.simulation_day)
        else:
            logger.info("No snapshot — starting fresh from day 0")
