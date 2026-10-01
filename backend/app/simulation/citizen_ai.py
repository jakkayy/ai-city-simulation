"""
Citizen AI — batch LLM calls for citizen reactions.

5 citizens per call → 50 citizens = 10 parallel LLM calls per tick.
Results are queued to _pending_updates buffer (applied next tick).
"""

import asyncio
import json
import logging
import re
from typing import Any

from app.models.citizen import Citizen
from app.simulation.gateway import LLMGateway
from app.simulation.state import queue_llm_update

logger = logging.getLogger(__name__)

_BATCH_SIZE = 5
_MODEL = "llama-3.3-70b-versatile"


# ── prompt helpers ────────────────────────────────────────────────────────

def escape_xml(text: str) -> str:
    """Sanitise citizen memory before embedding in XML prompt tags."""
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )


def _build_batch_prompt(
    citizens: list[Citizen],
    city_context: dict,
) -> list[dict]:
    citizen_blocks = []
    for i, c in enumerate(citizens):
        memory = escape_xml(c.memory_summary or "No prior memory.")
        citizen_blocks.append(
            f'<citizen index="{i}">\n'
            f"  Name: {c.name}, Age: {c.age}\n"
            f"  Job: {c.job_type.value}, Zone: {c.zone.value}\n"
            f"  Happiness: {c.happiness:.1f}/100, Savings: ${c.savings:.0f}\n"
            f"  Days unhappy: {c.days_unhappy}\n"
            f"  Personality: {c.personality.value}\n"
            f"  Last action: {c.last_action}\n"
            f"  Memory: <memory>{memory}</memory>\n"
            f"</citizen>"
        )

    system_msg = (
        "You are simulating realistic citizen reactions in a city simulation game. "
        "Respond ONLY with a valid JSON array — no markdown, no prose."
    )

    user_msg = (
        f"City today — Day {city_context.get('day', 0)}:\n"
        f"  Average happiness: {city_context.get('avg_happiness', 50):.1f}\n"
        f"  City fund: ${city_context.get('city_fund', 0):.0f}\n"
        f"  Service quality: {city_context.get('service_quality', 70):.1f}/100\n"
        f"  Tax rate: {city_context.get('tax_rate', 0.15)*100:.0f}%\n"
        f"  Recent policy: {city_context.get('recent_policy', 'none')}\n\n"
        + "\n\n".join(citizen_blocks)
        + "\n\nFor each citizen, provide their reaction to today's city conditions.\n"
        "Return a JSON array with exactly one object per citizen (same order):\n"
        '[\n  {"index": 0, "reaction": "one sentence", "happiness_delta": <-10 to 10>, '
        '"memory_update": "brief summary of current feelings"}\n]\n'
        "happiness_delta must be an integer. Be realistic based on each citizen's situation."
    )

    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


# ── response parsing ──────────────────────────────────────────────────────

def safe_parse_batch(raw: str, expected_count: int) -> list[dict]:
    """
    Parse LLM JSON response robustly.
    Falls back to per-citizen neutral defaults on any parse failure.
    """
    # strip markdown code fences
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list) and len(parsed) == expected_count:
            return [_validate_item(item, i) for i, item in enumerate(parsed)]
    except (json.JSONDecodeError, ValueError):
        pass

    # try to extract the first JSON array from the string
    match = re.search(r"\[.*?\]", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                results = [_validate_item(item, i) for i, item in enumerate(parsed)]
                while len(results) < expected_count:
                    results.append(_neutral_item(len(results)))
                return results[:expected_count]
        except (json.JSONDecodeError, ValueError):
            pass

    logger.warning("safe_parse_batch: full parse failed, using neutral defaults")
    return [_neutral_item(i) for i in range(expected_count)]


def _validate_item(item: Any, index: int) -> dict:
    if not isinstance(item, dict):
        return _neutral_item(index)
    return {
        "index": index,
        "reaction": str(item.get("reaction", "stayed quiet")),
        "happiness_delta": max(-10, min(10, int(item.get("happiness_delta", 0)))),
        "memory_update": str(item.get("memory_update", "")),
    }


def _neutral_item(index: int) -> dict:
    return {
        "index": index,
        "reaction": "went about their day",
        "happiness_delta": 0,
        "memory_update": "",
    }


# ── batch runner ──────────────────────────────────────────────────────────

async def _run_batch(
    batch: list[Citizen],
    city_context: dict,
    gateway: LLMGateway,
) -> None:
    messages = _build_batch_prompt(batch, city_context)
    try:
        raw = await gateway.call(messages, model=_MODEL, priority=3)
        results = safe_parse_batch(raw, expected_count=len(batch))
    except Exception as exc:
        logger.warning("Citizen AI batch failed, using neutral defaults: %s", exc)
        results = [_neutral_item(i) for i in range(len(batch))]

    for item, citizen in zip(results, batch):
        delta = item["happiness_delta"]
        new_happiness = max(0.0, min(100.0, citizen.happiness + delta))
        update: dict = {
            "last_action": item["reaction"][:50],
            "happiness": new_happiness,
            "pending_reaction": False,
        }
        if item["memory_update"]:
            update["memory_summary"] = item["memory_update"][:500]
        queue_llm_update(str(citizen.id), update)


async def run_citizen_ai_tick(
    citizens: list[Citizen],
    city_context: dict,
    gateway: LLMGateway,
) -> None:
    """
    Fire batched LLM calls for all citizens (non-blocking).
    Results land in _pending_updates and are applied next tick.
    """
    # mark all citizens as awaiting LLM response
    for c in citizens:
        queue_llm_update(str(c.id), {"pending_reaction": True})

    batches = [
        citizens[i : i + _BATCH_SIZE]
        for i in range(0, len(citizens), _BATCH_SIZE)
    ]

    tasks = [
        asyncio.create_task(_run_batch(b, city_context, gateway))
        for b in batches
    ]

    asyncio.gather(*tasks, return_exceptions=True)
    logger.info("Citizen AI: queued %d batch(es) for %d citizens", len(batches), len(citizens))
