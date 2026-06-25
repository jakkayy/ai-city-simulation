import random
from app.models.citizen import Citizen, JobType
from app.simulation.constants import (
    DAILY_INCOME,
    DAILY_RENT,
    DAILY_LIVING_EXPENSES,
    TAX_CAP,
    CITY_DAILY_OVERHEAD,
    SERVICE_QUALITY_RECOVERY,
    SERVICE_QUALITY_DECAY,
    SAVINGS_FLOOR_MONTHS,
    JOB_RECOVERY_CHANCE,
)
from app.simulation.state import CityState


def compute_citizen_daily(citizen: Citizen, tax_rate: float) -> dict:
    """Return one citizen's daily income, costs, and net savings change."""
    income = DAILY_INCOME[citizen.job_type]
    rent = DAILY_RENT[citizen.zone]
    living = DAILY_LIVING_EXPENSES[citizen.zone]
    tax = income * min(tax_rate, TAX_CAP)
    net = income - tax - rent - living
    return {
        "income": income,
        "rent": rent,
        "living": living,
        "tax": tax,
        "net": net,
    }


def apply_economy_tick(citizens: list[Citizen], state: CityState) -> dict:
    """
    Run one day of the economy loop. Mutates citizens (savings, job_type,
    last_action) and state (city_fund, service_quality) in place.

    Returns a summary dict with events to be persisted by the caller.
    """
    total_tax = 0.0
    events: list[dict] = []

    for citizen in citizens:
        daily = compute_citizen_daily(citizen, state.tax_rate)
        citizen.savings += daily["net"]
        total_tax += daily["tax"]

        # 5 % chance unemployed citizens find laborer work
        if citizen.job_type == JobType.unemployed:
            if random.random() < JOB_RECOVERY_CHANCE:
                citizen.job_type = JobType.laborer
                citizen.last_action = "got_job"
                events.append({
                    "citizen_id": str(citizen.id),
                    "event_type": "job_recovery",
                    "narrative": f"{citizen.name} found work as a laborer.",
                    "happiness_delta": 5,
                })

        # mark citizens who hit the savings floor so zone engine can act
        savings_floor = -(SAVINGS_FLOOR_MONTHS * DAILY_RENT[citizen.zone] * 30)
        if citizen.savings < savings_floor:
            citizen.last_action = "savings_critical"

    # update city fund
    state.city_fund += total_tax - CITY_DAILY_OVERHEAD

    # service quality drifts up when solvent, down when insolvent
    if state.city_fund > 0:
        state.service_quality = min(100.0, state.service_quality + SERVICE_QUALITY_RECOVERY)
    else:
        state.service_quality = max(0.0, state.service_quality - SERVICE_QUALITY_DECAY)

    return {
        "total_tax_collected": total_tax,
        "city_fund": state.city_fund,
        "service_quality": state.service_quality,
        "events": events,
    }
