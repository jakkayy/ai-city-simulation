import random
from app.models.citizen import Citizen, JobType, Zone
from app.simulation.constants import (
    DAILY_INCOME,
    DAILY_RENT,
    DAILY_LIVING_EXPENSES,
    TAX_CAP,
    CITY_BASE_OVERHEAD,
    CITY_SERVICE_COST_PER_POINT,
    FUND_RESERVE,
    SERVICE_QUALITY_RECOVERY,
    SERVICE_QUALITY_SLOW_DECAY,
    SERVICE_QUALITY_DECAY,
    SAVINGS_FLOOR_MONTHS,
    BANKRUPTCY_FACTOR,
    WEALTH_SPENDING_THRESHOLD,
    WEALTH_SPENDING_RATE,
    JOB_RECOVERY_CHANCE,
    JOB_LOSS_CHANCE,
)
from app.simulation.state import CityState


_JOBS_BY_ZONE: dict = {
    Zone.A: [JobType.professional, JobType.professional, JobType.business_owner, JobType.teacher],
    Zone.B: [JobType.teacher, JobType.service_worker, JobType.professional, JobType.service_worker],
    Zone.C: [JobType.laborer, JobType.laborer, JobType.service_worker, JobType.farmer],
}


def city_overhead(service_quality: float) -> float:
    """Daily running cost of the city; better services cost more."""
    return CITY_BASE_OVERHEAD + CITY_SERVICE_COST_PER_POINT * service_quality


def savings_floor(citizen: Citizen) -> float:
    return -(SAVINGS_FLOOR_MONTHS * DAILY_RENT[citizen.zone] * 30)


def compute_citizen_daily(citizen: Citizen, tax_rate: float, income_modifier: float = 1.0) -> dict:
    """Return one citizen's daily income, costs, and net savings change."""
    income = DAILY_INCOME[citizen.job_type] * income_modifier
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
        daily = compute_citizen_daily(citizen, state.tax_rate, state.income_modifier)
        citizen.savings += daily["net"]
        total_tax += daily["tax"]

        # the wealthy spend part of their surplus, so savings level off
        excess = citizen.savings - WEALTH_SPENDING_THRESHOLD
        if excess > 0:
            citizen.savings -= excess * WEALTH_SPENDING_RATE

        # 5 % chance unemployed citizens find work (a job that fits their neighbourhood)
        if citizen.job_type == JobType.unemployed:
            if random.random() < JOB_RECOVERY_CHANCE:
                job = random.choice(_JOBS_BY_ZONE[citizen.zone])
                citizen.job_type = job
                citizen.last_action = "got_job"
                events.append({
                    "citizen_id": str(citizen.id),
                    "event_type": "job_recovery",
                    "narrative": f"{citizen.name} found work as a {job.value.replace('_', ' ')}.",
                    "happiness_delta": 5,
                })

        floor = savings_floor(citizen)

        # far below the floor: debt is written off so it cannot grow forever
        if citizen.savings < floor * BANKRUPTCY_FACTOR:
            citizen.savings = 0.0
            citizen.happiness = max(0.0, citizen.happiness - 10.0)
            citizen.last_action = "bankrupt"
            events.append({
                "citizen_id": str(citizen.id),
                "event_type": "bankruptcy",
                "narrative": f"{citizen.name} went bankrupt and their debts were written off.",
                "happiness_delta": -10,
            })
        # mark citizens who hit the savings floor so zone engine can act
        elif citizen.savings < floor:
            citizen.last_action = "savings_critical"

    # update city fund
    state.city_fund += total_tax - city_overhead(state.service_quality)

    # service quality: improves only with a healthy reserve, wears out when thin
    if state.city_fund > FUND_RESERVE:
        state.service_quality = min(100.0, state.service_quality + SERVICE_QUALITY_RECOVERY)
    elif state.city_fund > 0:
        state.service_quality = max(0.0, state.service_quality - SERVICE_QUALITY_SLOW_DECAY)
    else:
        state.service_quality = max(0.0, state.service_quality - SERVICE_QUALITY_DECAY)

    return {
        "total_tax_collected": total_tax,
        "city_fund": state.city_fund,
        "service_quality": state.service_quality,
        "events": events,
    }


def apply_job_market(citizens: list[Citizen]) -> list[dict]:
    """Employed citizens occasionally lose their job. Mutates in place."""
    events: list[dict] = []
    for citizen in citizens:
        if citizen.job_type == JobType.unemployed:
            continue
        if random.random() < JOB_LOSS_CHANCE:
            citizen.job_type = JobType.unemployed
            citizen.last_action = "lost_job"
            citizen.happiness = max(0.0, citizen.happiness - 8.0)
            events.append({
                "citizen_id": str(citizen.id),
                "event_type": "job_loss",
                "narrative": f"{citizen.name} lost their job.",
                "happiness_delta": -8,
            })
    return events
