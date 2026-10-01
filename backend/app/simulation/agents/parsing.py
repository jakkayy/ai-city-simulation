"""Reading the City Manager's JSON answer out of an LLM reply."""

import json
import re

from app.simulation.policy_engine import VALID_POLICY_TYPES


def parse_json_proposal(raw: str) -> dict | None:
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError:
            return None

    if not isinstance(data, dict):
        return None
    policy_type = data.get("policy_type", "")
    if policy_type not in VALID_POLICY_TYPES:
        return None
    return {
        "policy_type": policy_type,
        "parameters": data.get("parameters", {}),
        "reasoning": str(data.get("reasoning", ""))[:200],
    }
