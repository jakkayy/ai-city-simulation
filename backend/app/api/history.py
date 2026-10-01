"""Saved history of the city: snapshots, replaying a saved day, and starting over."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.seed import seed_citizens
from app.models.event import Event
from app.models.policy import Policy
from app.models.snapshot import DailySnapshot
from app.simulation.agents import agent_status
from app.simulation.loop import _emit, _tick_lock, reset_loop_state
from app.simulation.snapshots import restore_city_from_data, restore_from_snapshot
from app.simulation.state import city_state, reset_city_state

router = APIRouter(prefix="/simulation", tags=["history"])


class ReplayRequest(BaseModel):
    from_day: int = Field(..., ge=0)


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
        agent_status.reset()

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
