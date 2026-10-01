"""
Applying an enacted policy: its immediate effect on the city (tax rate, services, fund) and on
the citizens (reactions, jobs created, housing payouts). Validation and prediction live in
policy_engine.py.
"""

import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.simulation.constants import (
    HOUSING_SUBSIDY_SHARE,
    SERVICE_CUT_SAVING_PER_POINT,
    SERVICE_POLICY_COST_PER_POINT,
    TAX_CAP,
)
from app.simulation.fallback import get_reaction
from app.simulation.state import city_state


def apply_policy_to_city(policy_type: str, parameters: dict) -> dict:
    """
    Immediately apply a policy's city-level effects to city_state.
    Returns a dict of what actually changed.
    """
    applied: dict = {}

    if policy_type in ("tax_increase", "tax_decrease"):
        new_rate = parameters.get("tax_rate", city_state.tax_rate)
        city_state.tax_rate = min(new_rate, TAX_CAP)
        applied["tax_rate"] = city_state.tax_rate

    elif policy_type in ("service_boost", "service_cut"):
        delta = parameters.get("service_quality_delta", 0)
        before = city_state.service_quality
        city_state.service_quality = max(0.0, min(100.0, before + delta))
        points = abs(city_state.service_quality - before)   # clamping: pay for what was applied
        if delta > 0:
            city_state.city_fund -= points * SERVICE_POLICY_COST_PER_POINT
        else:
            city_state.city_fund += points * SERVICE_CUT_SAVING_PER_POINT
        applied["service_quality"] = city_state.service_quality
        applied["city_fund"] = city_state.city_fund

    elif policy_type in ("housing", "job_program"):
        cost = parameters.get("fund_cost", 0)
        city_state.city_fund -= cost
        applied["city_fund"] = city_state.city_fund

    city_state.recent_policy = policy_type
    return applied


async def apply_citizen_reactions_to_policy(
    policy_id: uuid.UUID,
    policy_type: str,
    db: AsyncSession,
    parameters: dict | None = None,
) -> list[dict]:
    """
    Apply rule-based happiness reactions to all citizens for a new policy.
    Persists one Event per affected citizen. Returns list of event dicts.
    """
    from app.models.citizen import Citizen
    from app.models.event import Event

    result = await db.execute(select(Citizen))
    citizens = list(result.scalars().all())

    events: list[dict] = []
    events.extend(_apply_policy_side_effects(policy_type, parameters or {}, citizens, policy_id, db))

    for citizen in citizens:
        reaction = get_reaction(citizen, policy_type)
        delta = reaction["happiness_delta"]

        citizen.happiness = max(0.0, min(100.0, citizen.happiness + delta))
        citizen.last_action = reaction["reaction"][:50]

        if delta != 0:
            db.add(Event(
                simulation_day=city_state.simulation_day,
                citizen_id=citizen.id,
                policy_id=policy_id,
                event_type="policy_reaction",
                narrative=f"{citizen.name} {reaction['reaction']}.",
                happiness_delta=float(delta),
            ))
            events.append({
                "citizen_id": str(citizen.id),
                "happiness_delta": delta,
                "narrative": f"{citizen.name} {reaction['reaction']}.",
            })

    return events


def _apply_policy_side_effects(
    policy_type: str,
    parameters: dict,
    citizens: list,
    policy_id: uuid.UUID,
    db: AsyncSession,
) -> list[dict]:
    """Concrete effects on citizens: job programmes employ people, housing pays out to Zone C."""
    from app.models.citizen import JobType, Zone
    from app.models.event import Event

    events: list[dict] = []

    def record(citizen, event_type: str, text: str, delta: float = 0.0) -> None:
        db.add(Event(
            simulation_day=city_state.simulation_day,
            citizen_id=citizen.id,
            policy_id=policy_id,
            event_type=event_type,
            narrative=text,
            happiness_delta=delta,
        ))

    if policy_type == "job_program":
        share = float(parameters.get("unemployment_reduction", 0.0))
        if share > 1:          # tolerate percent values
            share /= 100
        jobless = sorted(
            (c for c in citizens if c.job_type == JobType.unemployed),
            key=lambda c: str(c.id),
        )
        hired = jobless[: math.ceil(len(jobless) * max(0.0, min(1.0, share)))]
        for c in hired:
            c.job_type = JobType.laborer
            c.last_action = "got_job"
            record(c, "job_recovery", f"{c.name} was hired through the job programme.", 5.0)
            events.append({
                "citizen_id": str(c.id),
                "happiness_delta": 0,
                "narrative": f"{c.name} was hired through the job programme.",
            })

    elif policy_type == "housing":
        residents = [c for c in citizens if c.zone == Zone.C]
        if residents:
            payout = parameters.get("fund_cost", 0) * HOUSING_SUBSIDY_SHARE / len(residents)
            for c in residents:
                c.savings += payout

    return events
