"""
Happiness model. Each citizen has a target happiness computed from their
situation; the current value drifts toward it, so happiness stays bounded and
responds to taxes, services, money, housing zone and employment.
"""
from app.models.citizen import Citizen, JobType
from app.simulation.constants import (
    DAILY_RENT,
    HAPPINESS_BASE,
    HAPPINESS_DRIFT_RATE,
    ZONE_HAPPINESS_MODIFIER,
)
from app.simulation.state import CityState

_DEFAULT_TAX = 0.15


def target_happiness(citizen: Citizen, state: CityState) -> float:
    zone = ZONE_HAPPINESS_MODIFIER[citizen.zone]
    service = (state.service_quality - 50.0) * 0.3
    tax = -(state.tax_rate - _DEFAULT_TAX) * 80.0
    months_of_rent = citizen.savings / (DAILY_RENT[citizen.zone] * 30)
    finance = max(-15.0, min(10.0, months_of_rent * 3.0))
    job = -12.0 if citizen.job_type == JobType.unemployed else 0.0
    return max(0.0, min(100.0, HAPPINESS_BASE + zone + service + tax + finance + job))


def apply_happiness_tick(citizens: list[Citizen], state: CityState) -> None:
    for c in citizens:
        target = target_happiness(c, state)
        c.happiness = max(0.0, min(100.0, c.happiness + (target - c.happiness) * HAPPINESS_DRIFT_RATE))
        c.days_unhappy = (c.days_unhappy + 1) if c.happiness < 40.0 else 0
