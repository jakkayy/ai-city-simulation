"""
Rule-based fallback engine — used when LLM is unavailable or in replay mode.
REACTION_MATRIX maps (personality, policy_type) → happiness_delta.
"""

from app.models.citizen import Citizen, Personality

# (personality, policy_type) → happiness_delta
REACTION_MATRIX: dict[tuple[str, str], int] = {
    # tax increase
    (Personality.optimistic,  "tax_increase"):  -1,
    (Personality.pessimistic, "tax_increase"):  -4,
    (Personality.rational,    "tax_increase"):  -2,
    (Personality.impulsive,   "tax_increase"):  -5,
    # tax decrease
    (Personality.optimistic,  "tax_decrease"):   3,
    (Personality.pessimistic, "tax_decrease"):   1,
    (Personality.rational,    "tax_decrease"):   2,
    (Personality.impulsive,   "tax_decrease"):   4,
    # service improvement
    (Personality.optimistic,  "service_boost"):  4,
    (Personality.pessimistic, "service_boost"):  1,
    (Personality.rational,    "service_boost"):  3,
    (Personality.impulsive,   "service_boost"):  2,
    # service cut
    (Personality.optimistic,  "service_cut"):   -2,
    (Personality.pessimistic, "service_cut"):   -5,
    (Personality.rational,    "service_cut"):   -3,
    (Personality.impulsive,   "service_cut"):   -4,
    # housing subsidy
    (Personality.optimistic,  "housing"):        3,
    (Personality.pessimistic, "housing"):        2,
    (Personality.rational,    "housing"):        2,
    (Personality.impulsive,   "housing"):        3,
    # job program
    (Personality.optimistic,  "job_program"):    4,
    (Personality.pessimistic, "job_program"):    2,
    (Personality.rational,    "job_program"):    3,
    (Personality.impulsive,   "job_program"):    5,
}

_DEFAULT_DELTA = 0


def get_reaction(citizen: Citizen, policy_type: str) -> dict:
    """Return a fallback reaction dict for a citizen given a policy type."""
    delta = REACTION_MATRIX.get((citizen.personality, policy_type), _DEFAULT_DELTA)
    reaction = _reaction_text(citizen.personality, policy_type, delta)
    return {
        "reaction": reaction,
        "happiness_delta": delta,
        "memory_update": f"Reacted to {policy_type} policy (rule-based).",
    }


def apply_fallback_tick(citizens: list[Citizen], policy_type: str = "") -> list[dict]:
    """Apply rule-based reactions to all citizens. Returns event list."""
    events = []
    for c in citizens:
        result = get_reaction(c, policy_type) if policy_type else {
            "reaction": "went about their day",
            "happiness_delta": 0,
            "memory_update": "",
        }
        delta = result["happiness_delta"]
        c.happiness = max(0.0, min(100.0, c.happiness + delta))
        c.last_action = result["reaction"][:50]
        if delta != 0:
            events.append({
                "citizen_id": str(c.id),
                "event_type": "fallback_reaction",
                "narrative": f"{c.name}: {result['reaction']}",
                "happiness_delta": delta,
            })
    return events


def _reaction_text(personality: Personality, policy_type: str, delta: int) -> str:
    tone = "positively" if delta > 0 else "negatively" if delta < 0 else "neutrally"
    return f"reacted {tone} to the {policy_type} policy"
