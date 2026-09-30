"""Random city-wide events that keep the simulation from settling into a fixed point."""
import random

from app.models.citizen import Citizen
from app.simulation.constants import CITY_EVENT_CHANCE
from app.simulation.state import CityState

_MODIFIER_DAYS = 8


def _shift_happiness(citizens: list[Citizen], delta: float) -> None:
    for c in citizens:
        c.happiness = max(0.0, min(100.0, c.happiness + delta))


def maybe_city_event(state: CityState, citizens: list[Citizen]) -> dict | None:
    """Tick down an active income modifier and possibly trigger a new event."""
    if state.modifier_days > 0:
        state.modifier_days -= 1
        if state.modifier_days == 0:
            state.income_modifier = 1.0

    if random.random() >= CITY_EVENT_CHANCE:
        return None

    kinds = ["disaster", "grant"]
    if state.modifier_days == 0:
        kinds += ["recession", "boom"]
    kind = random.choice(kinds)

    if kind == "recession":
        state.income_modifier, state.modifier_days = 0.8, _MODIFIER_DAYS
        _shift_happiness(citizens, -3)
        text, delta = f"Recession: incomes fall 20% for {_MODIFIER_DAYS} days.", -3
        data = {"kind": "recession", "days": _MODIFIER_DAYS}
    elif kind == "boom":
        state.income_modifier, state.modifier_days = 1.2, _MODIFIER_DAYS
        _shift_happiness(citizens, 3)
        text, delta = f"Economic boom: incomes rise 20% for {_MODIFIER_DAYS} days.", 3
        data = {"kind": "boom", "days": _MODIFIER_DAYS}
    elif kind == "disaster":
        state.service_quality = max(0.0, state.service_quality - 15.0)
        state.city_fund -= 2_000.0
        _shift_happiness(citizens, -5)
        text, delta = "Disaster strikes: services are damaged and repairs cost $2,000.", -5
        data = {"kind": "disaster", "cost": 2_000}
    else:
        state.city_fund += 3_000.0
        text, delta = "The state sends a $3,000 grant to the city fund.", 0
        data = {"kind": "grant", "amount": 3_000}

    return {
        "citizen_id": None,
        "event_type": "city_event",
        "narrative": text,
        "happiness_delta": delta,
        "data": data,
    }
