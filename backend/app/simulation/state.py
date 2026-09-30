from dataclasses import dataclass, field
from app.simulation.constants import DEFAULT_TAX_RATE, DEFAULT_SERVICE_QUALITY


@dataclass
class CityState:
    simulation_day: int = 0
    city_fund: float = 10_000.0
    service_quality: float = DEFAULT_SERVICE_QUALITY
    tax_rate: float = DEFAULT_TAX_RATE
    active_policy_ids: list[str] = field(default_factory=list)
    recent_policy: str = ""        # policy_type of last enacted policy
    is_running: bool = False
    seed: int | None = None
    replay_mode: bool = False
    tick_interval_seconds: int = 10
    # temporary city-wide income multiplier (recession / boom)
    income_modifier: float = 1.0
    modifier_days: int = 0
    # replay works on an in-memory copy of the citizens: {citizen_id: {field: value}}
    replay_state: dict = field(default_factory=dict)


# singleton — shared across the app process
city_state = CityState()

# LLM results buffered here; applied at the start of the next tick
_pending_updates: dict[str, dict] = {}


def queue_llm_update(citizen_id: str, updates: dict) -> None:
    """Called by the LLM engine. Applied at the start of the next tick."""
    _pending_updates.setdefault(citizen_id, {}).update(updates)


def reset_city_state() -> None:
    """Back to a brand-new city (keeps the configured tick interval)."""
    interval = city_state.tick_interval_seconds
    fresh = CityState()
    for name, value in vars(fresh).items():
        setattr(city_state, name, value)
    city_state.tick_interval_seconds = interval
    _pending_updates.clear()
