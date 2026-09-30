from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select

from app.db.database import get_db
from app.models.snapshot import DailySnapshot
from app.db.seed import seed_citizens
from app.models.event import Event
from app.models.policy import Policy
from app.simulation.agents import agent_status
from app.simulation.state import city_state, reset_city_state
from app.simulation.loop import (
    _emit,
    _tick_lock,
    reset_loop_state,
    restore_city_from_data,
    restore_from_snapshot,
    run_tick,
)

router = APIRouter(prefix="/simulation", tags=["simulation"])


class StartRequest(BaseModel):
    tick_interval_seconds: int = Field(default=60, ge=1, le=3600)


class SpeedRequest(BaseModel):
    tick_interval_seconds: int = Field(..., ge=1, le=3600)


class ReplayRequest(BaseModel):
    from_day: int = Field(..., ge=0)


def _set_interval(seconds: int) -> None:
    city_state.tick_interval_seconds = seconds
    from app.main import get_scheduler
    job = get_scheduler().get_job("tick")
    if job:
        job.reschedule(trigger="interval", seconds=seconds)


@router.post("/start")
async def start_simulation(body: StartRequest):
    if city_state.is_running:
        raise HTTPException(status_code=409, detail="Simulation already running")
    city_state.is_running = True
    city_state.replay_mode = False
    _set_interval(body.tick_interval_seconds)
    return {"status": "started", "tick_interval_seconds": body.tick_interval_seconds}


@router.post("/speed")
async def set_speed(body: SpeedRequest):
    """Change the tick interval while running or paused."""
    _set_interval(body.tick_interval_seconds)
    return {"status": "ok", "tick_interval_seconds": body.tick_interval_seconds}


@router.post("/stop")
async def stop_simulation():
    city_state.is_running = False
    return {"status": "stopped"}


@router.post("/step")
async def step_simulation():
    """Advance exactly one day regardless of is_running state."""
    if city_state.replay_mode:
        raise HTTPException(status_code=409, detail="Stop the replay before stepping")
    was_running = city_state.is_running
    city_state.is_running = True
    try:
        ran = await run_tick()
    finally:
        city_state.is_running = was_running
    if not ran:
        raise HTTPException(status_code=409, detail="A day is still being simulated, try again in a moment")
    return {"status": "stepped", "day": city_state.simulation_day}


@router.post("/replay")
async def start_replay(body: ReplayRequest, db: AsyncSession = Depends(get_db)):
    """
    Re-run the city from a saved day on an in-memory copy. Nothing is written to the
    database, no LLM is called, and the run is seeded by the day so it is repeatable.
    """
    if city_state.is_running:
        raise HTTPException(status_code=409, detail="Stop the simulation before replaying")

    result = await db.execute(
        select(DailySnapshot).where(DailySnapshot.simulation_day == body.from_day)
    )
    snap = result.scalar_one_or_none()
    if not snap:
        raise HTTPException(
            status_code=404,
            detail=f"No snapshot found for day {body.from_day}",
        )
    data = snap.snapshot_data or {}
    if "citizens" not in data:
        raise HTTPException(
            status_code=422,
            detail=f"Day {body.from_day} was recorded before replay support and has no citizen data",
        )

    # the snapshot holds the state *after* that day, so the replay resumes on the next one
    city_state.simulation_day = snap.simulation_day + 1
    city_state.city_fund = snap.city_fund
    city_state.service_quality = snap.service_quality
    restore_city_from_data(data)
    city_state.replay_state = data["citizens"]
    city_state.replay_mode = True
    city_state.is_running = True

    return {
        "status": "replay_started",
        "from_day": body.from_day,
        "city_fund": snap.city_fund,
        "service_quality": snap.service_quality,
        "replay_mode": True,
    }


@router.post("/replay/stop")
async def stop_replay():
    """Leave replay mode and return the city to its real, latest state."""
    city_state.is_running = False
    city_state.replay_mode = False
    city_state.replay_state = {}
    await restore_from_snapshot()
    return {"status": "replay_stopped"}


@router.post("/reset")
async def reset_city(db: AsyncSession = Depends(get_db)):
    """Wipe all history and start a brand-new city with freshly generated citizens."""
    if city_state.is_running or city_state.replay_mode:
        raise HTTPException(status_code=409, detail="Pause the simulation before resetting the city")
    if _tick_lock.locked():
        raise HTTPException(status_code=409, detail="A day is still being simulated, try again in a moment")

    async with _tick_lock:
        await db.execute(delete(Event))
        await db.execute(delete(Policy))
        await db.execute(delete(DailySnapshot))
        await db.flush()
        await seed_citizens(db)   # replaces the citizens and commits

        reset_city_state()
        reset_loop_state()
        agent_status.city_manager_last_run_day = -1
        agent_status.city_manager_last_proposal = {}
        agent_status.advisor_last_advice = ""
        agent_status.advisor_last_crisis = ""

    await _emit("city_reset", {})
    return {"status": "reset"}


@router.get("/snapshots")
async def list_snapshots(limit: int = 300, db: AsyncSession = Depends(get_db)):
    """Saved days that can be replayed (most recent `limit`, oldest first)."""
    result = await db.execute(
        select(DailySnapshot)
        .where(DailySnapshot.snapshot_data.has_key("citizens"))
        .order_by(DailySnapshot.simulation_day.desc())
        .limit(max(1, min(limit, 1000)))
    )
    rows = list(result.scalars().all())[::-1]
    return [
        {
            "simulation_day": s.simulation_day,
            "avg_happiness": round(s.avg_happiness, 2),
            "city_fund": round(s.city_fund, 2),
            "service_quality": round(s.service_quality, 2),
        }
        for s in rows
    ]


@router.get("/status")
async def simulation_status():
    return {
        "is_running": city_state.is_running,
        "replay_mode": city_state.replay_mode,
        "simulation_day": city_state.simulation_day,
        "city_fund": round(city_state.city_fund, 2),
        "service_quality": round(city_state.service_quality, 2),
        "tax_rate": city_state.tax_rate,
        "tick_interval_seconds": city_state.tick_interval_seconds,
    }
