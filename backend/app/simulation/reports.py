"""
End-of-day report. Built from what really happened that day (numbers, counted events, city
events, policies enacted) and saved inside the day's snapshot. When an LLM is available a short
bulletin is added afterwards, in Thai and English, without delaying the tick.
"""

import asyncio
import json
import logging
import re
from collections import Counter

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.models.policy import Policy
from app.models.snapshot import DailySnapshot

logger = logging.getLogger(__name__)

# a day is "notable" (worth a popup) when something stands out
HAPPINESS_SWING = 4.0
BANKRUPTCIES = 2

NARRATIVE_MAX_CHARS = 320
_NARRATIVE_PRIORITY = 2   # below the City Manager / Advisor (1), above the citizens (3)


def build_report(
    *,
    day: int,
    avg_happiness: float,
    fund: float,
    service_quality: float,
    tax_rate: float,
    prev: dict | None,
    events: list[dict],
    crisis: str | None,
    policies: list[dict],
) -> dict:
    """prev = {"avg_happiness", "city_fund"} of the previous day, or None."""
    kinds = Counter(ev["event_type"] for ev in events)
    city_events = [ev["data"] for ev in events if ev["event_type"] == "city_event" and ev.get("data")]

    happiness_delta = round(avg_happiness - prev["avg_happiness"], 1) if prev else None
    fund_delta = round(fund - prev["city_fund"]) if prev else None

    highlight = bool(
        crisis
        or city_events
        or kinds["bankruptcy"] >= BANKRUPTCIES
        or (happiness_delta is not None and abs(happiness_delta) >= HAPPINESS_SWING)
    )

    return {
        "day": day,
        "happiness": round(avg_happiness, 1),
        "happiness_delta": happiness_delta,
        "fund": round(fund),
        "fund_delta": fund_delta,
        "service": round(service_quality, 1),
        "tax_rate": tax_rate,
        "counts": {
            "moves": kinds["migration"],
            "waitlist": kinds["migration_waitlisted"],
            "job_loss": kinds["job_loss"],
            "job_recovery": kinds["job_recovery"],
            "bankruptcy": kinds["bankruptcy"],
        },
        "city_events": city_events,
        "policies": policies,
        "crisis": crisis,
        "highlight": highlight,
    }


async def load_report_context(db: AsyncSession, day: int) -> tuple[dict | None, list[dict]]:
    """Yesterday's headline numbers and the policies enacted on `day`."""
    prev_row = (
        await db.execute(
            select(DailySnapshot.avg_happiness, DailySnapshot.city_fund).where(
                DailySnapshot.simulation_day == day - 1
            )
        )
    ).first()
    prev = {"avg_happiness": prev_row[0], "city_fund": prev_row[1]} if prev_row else None

    rows = (await db.execute(select(Policy.name, Policy.policy_type).where(Policy.enacted_day == day))).all()
    return prev, [{"name": name, "type": ptype} for name, ptype in rows]


# ── LLM bulletin ──────────────────────────────────────────────────────────

def narrative_prompt(report: dict) -> list[dict]:
    facts = {k: report[k] for k in ("day", "happiness", "happiness_delta", "fund", "fund_delta",
                                    "service", "counts", "city_events", "policies", "crisis")}
    return [
        {
            "role": "system",
            "content": (
                "You write the end-of-day news bulletin of a simulated city. "
                "Use only the facts given. Reply with ONLY a JSON object "
                '{"th": "...", "en": "..."}: the same bulletin in Thai and in English, '
                "at most two short sentences each, no markdown."
            ),
        },
        {"role": "user", "content": json.dumps(facts, ensure_ascii=False)},
    ]


def parse_narrative(raw: str) -> dict | None:
    """{"th", "en"} from the LLM reply, or None if it is not usable."""
    cleaned = re.sub(r"```(?:json)?|```", "", raw or "").strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    out = {}
    for lang in ("th", "en"):
        text = data.get(lang)
        if not isinstance(text, str) or not text.strip():
            return None
        out[lang] = text.strip()[:NARRATIVE_MAX_CHARS]
    return out


async def save_narrative(day: int, narrative: dict) -> bool:
    async with AsyncSessionLocal() as db:
        snap = (
            await db.execute(select(DailySnapshot).where(DailySnapshot.simulation_day == day))
        ).scalar_one_or_none()
        if snap is None or "report" not in (snap.snapshot_data or {}):
            return False
        data = dict(snap.snapshot_data)           # reassign so the JSONB change is detected
        data["report"] = {**data["report"], "narrative": narrative}
        snap.snapshot_data = data
        await db.commit()
        return True


async def attach_narrative(report: dict, gateway, emit) -> None:
    """Ask the LLM for the bulletin, store it with the report and tell the clients."""
    try:
        raw = await gateway.call(narrative_prompt(report), priority=_NARRATIVE_PRIORITY)
        narrative = parse_narrative(raw)
        if narrative is None:
            logger.info("Day %d bulletin: unusable LLM reply", report["day"])
            return
        if await save_narrative(report["day"], narrative):
            await emit("report_narrative", {"day": report["day"], "narrative": narrative})
    except Exception as exc:   # the report stands on its own; the bulletin is a bonus
        logger.warning("Day %d bulletin failed: %s", report.get("day"), exc)


_background: set[asyncio.Task] = set()


def spawn_narrative(report: dict, gateway, emit) -> None:
    """Fire and forget (keeping a reference so the task is not garbage-collected)."""
    task = asyncio.create_task(attach_narrative(report, gateway, emit))
    _background.add(task)
    task.add_done_callback(_background.discard)
