"""
Policy engine — sanitisation, effect prediction, and application.
"""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.simulation.constants import TAX_CAP
from app.simulation.state import city_state
from app.simulation.fallback import get_reaction

# valid policy types and the parameters each one accepts
_POLICY_SCHEMA: dict[str, set[str]] = {
    "tax_increase":    {"tax_rate"},
    "tax_decrease":    {"tax_rate"},
    "service_boost":   {"service_quality_delta"},
    "service_cut":     {"service_quality_delta"},
    "housing":         {"fund_cost"},
    "job_program":     {"fund_cost", "unemployment_reduction"},
}

VALID_POLICY_TYPES = set(_POLICY_SCHEMA.keys())


class PolicyValidationError(ValueError):
    pass


def sanitize_policy(policy_type: str, parameters: dict) -> dict:
    """
    Validate and clamp policy parameters.
    Raises PolicyValidationError on invalid input.
    Returns a cleaned parameters dict.
    """
    if policy_type not in VALID_POLICY_TYPES:
        raise PolicyValidationError(
            f"Unknown policy type '{policy_type}'. "
            f"Valid types: {sorted(VALID_POLICY_TYPES)}"
        )

    allowed_keys = _POLICY_SCHEMA[policy_type]
    cleaned: dict = {}

    for key, value in parameters.items():
        if key not in allowed_keys:
            raise PolicyValidationError(
                f"Parameter '{key}' is not allowed for policy '{policy_type}'. "
                f"Allowed: {sorted(allowed_keys)}"
            )
        if not isinstance(value, (int, float)):
            raise PolicyValidationError(
                f"Parameter '{key}' must be numeric, got {type(value).__name__}"
            )
        cleaned[key] = value

    # enforce tax cap
    if "tax_rate" in cleaned:
        raw = cleaned["tax_rate"]
        if raw < 0:
            raise PolicyValidationError("tax_rate cannot be negative")
        cleaned["tax_rate"] = min(float(raw), TAX_CAP)

    # clamp service quality delta to ±50
    if "service_quality_delta" in cleaned:
        cleaned["service_quality_delta"] = max(
            -50.0, min(50.0, float(cleaned["service_quality_delta"]))
        )

    # fund costs must be positive
    if "fund_cost" in cleaned and cleaned["fund_cost"] < 0:
        raise PolicyValidationError("fund_cost cannot be negative")

    return cleaned


def predict_effects(policy_type: str, parameters: dict) -> dict:
    """Estimate the city-level impact of a policy before enacting it."""
    effects: dict = {}

    if policy_type in ("tax_increase", "tax_decrease"):
        new_rate = parameters.get("tax_rate", city_state.tax_rate)
        delta = new_rate - city_state.tax_rate
        effects["tax_rate_change"] = round(delta, 4)
        effects["happiness_impact"] = "negative" if delta > 0 else "positive"

    elif policy_type in ("service_boost", "service_cut"):
        delta = parameters.get("service_quality_delta", 0)
        effects["service_quality_change"] = delta
        effects["happiness_impact"] = "positive" if delta > 0 else "negative"

    elif policy_type == "housing":
        cost = parameters.get("fund_cost", 0)
        effects["city_fund_cost"] = -cost
        effects["happiness_impact"] = "positive"

    elif policy_type == "job_program":
        cost = parameters.get("fund_cost", 0)
        reduction = parameters.get("unemployment_reduction", 0.1)
        effects["city_fund_cost"] = -cost
        effects["unemployment_reduction"] = reduction
        effects["happiness_impact"] = "positive"

    return effects


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
        city_state.service_quality = max(
            0.0, min(100.0, city_state.service_quality + delta)
        )
        applied["service_quality"] = city_state.service_quality

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
