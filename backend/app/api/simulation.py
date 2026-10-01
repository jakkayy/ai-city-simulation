from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.simulation.loop import run_tick
from app.simulation.state import city_state

router = APIRouter(prefix="/simulation", tags=["simulation"])


class StartRequest(BaseModel):
    tick_interval_seconds: int = Field(default=60, ge=1, le=3600)


class SpeedRequest(BaseModel):
    tick_interval_seconds: int = Field(..., ge=1, le=3600)


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
