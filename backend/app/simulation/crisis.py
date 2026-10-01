"""Crisis levels and the Policy Advisor's cooldown."""

from app.simulation.constants import CRISIS_THRESHOLDS

# The advisor is re-consulted at most every N days while in the same crisis level,
# otherwise it would fire an LLM call (and a banner) on every single tick.
ADVISOR_COOLDOWN_DAYS = 5
_advisor_last: tuple[int, str] | None = None   # (day, crisis_level)


def reset_advisor_cooldown() -> None:
    global _advisor_last
    _advisor_last = None


def advisor_due(day: int, crisis: str) -> bool:
    """True when the advisor should speak: crisis level changed or cooldown elapsed."""
    global _advisor_last
    if _advisor_last is not None:
        last_day, last_level = _advisor_last
        if last_level == crisis and day - last_day < ADVISOR_COOLDOWN_DAYS:
            return False
    _advisor_last = (day, crisis)
    return True


def check_crisis(avg_happiness: float) -> str | None:
    if avg_happiness <= CRISIS_THRESHOLDS["collapse"]:
        return "collapse"
    if avg_happiness <= CRISIS_THRESHOLDS["critical"]:
        return "critical"
    if avg_happiness <= CRISIS_THRESHOLDS["warning"]:
        return "warning"
    return None
