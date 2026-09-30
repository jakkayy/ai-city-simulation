from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.snapshot import DailySnapshot
from app.models.citizen import Citizen
from app.simulation.state import city_state
from app.simulation.loop import run_tick

router = APIRouter(prefix="/simulation", tags=["simulation"])


class StartRequest(BaseModel):
    tick_interval_seconds: int = Field(default=10, ge=1, le=3600)


class ReplayRequest(BaseModel):
    from_day: int = Field(..., ge=0)


@router.post("/start")
async def start_simulation(body: StartRequest):
    if city_state.is_running:
        raise HTTPException(status_code=409, detail="Simulation already running")
    city_state.is_running = True
    city_state.replay_mode = False

    from app.main import get_scheduler
    job = get_scheduler().get_job("tick")
    if job:
        job.reschedule(trigger="interval", seconds=body.tick_interval_seconds)

    return {"status": "started", "tick_interval_seconds": body.tick_interval_seconds}


@router.post("/stop")
async def stop_simulation():
    city_state.is_running = False
    return {"status": "stopped"}


@router.post("/step")
async def step_simulation():
    """Advance exactly one day regardless of is_running state."""
    was_running = city_state.is_running
    city_state.is_running = True
    await run_tick()
    city_state.is_running = was_running
    return {"status": "stepped", "day": city_state.simulation_day}


@router.post("/replay")
async def start_replay(body: ReplayRequest, db: AsyncSession = Depends(get_db)):
    """
    Restore city state from a past snapshot and re-run from that day.
    Replay mode forces rule-based reactions (no LLM) for reproducibility.
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

    city_state.simulation_day = snap.simulation_day
    city_state.city_fund = snap.city_fund
    city_state.service_quality = snap.service_quality
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
    """Exit replay mode and stop."""
    city_state.is_running = False
    city_state.replay_mode = False
    return {"status": "replay_stopped"}


@router.get("/snapshots")
async def list_snapshots(db: AsyncSession = Depends(get_db)):
    """Return all saved daily snapshots (for replay selection)."""
    result = await db.execute(
        select(DailySnapshot).order_by(DailySnapshot.simulation_day)
    )
    return [
        {
            "simulation_day": s.simulation_day,
            "avg_happiness": round(s.avg_happiness, 2),
            "city_fund": round(s.city_fund, 2),
            "service_quality": round(s.service_quality, 2),
        }
        for s in result.scalars().all()
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
    }
