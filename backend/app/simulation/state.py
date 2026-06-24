from dataclasses import dataclass, field
from app.simulation.constants import DEFAULT_TAX_RATE, DEFAULT_SERVICE_QUALITY


@dataclass
class CityState:
    simulation_day: int = 0
    city_fund: float = 10_000.0
    service_quality: float = DEFAULT_SERVICE_QUALITY
    tax_rate: float = DEFAULT_TAX_RATE
    active_policy_ids: list[str] = field(default_factory=list)
    is_running: bool = False
    seed: int | None = None
    replay_mode: bool = False


# singleton — shared across the app process
city_state = CityState()

# LLM results buffered here; applied at the start of the next tick
_pending_updates: dict[str, dict] = {}


def queue_llm_update(citizen_id: str, updates: dict) -> None:
    """Called by the LLM engine. Applied at the start of the next tick."""
    _pending_updates.setdefault(citizen_id, {}).update(updates)
