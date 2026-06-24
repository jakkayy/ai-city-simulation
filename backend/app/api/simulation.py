from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.simulation.state import city_state
from app.simulation.loop import run_tick

router = APIRouter(prefix="/simulation", tags=["simulation"])


class StartRequest(BaseModel):
    tick_interval_seconds: int = Field(default=10, ge=1, le=3600)


@router.post("/start")
async def start_simulation(body: StartRequest):
    if city_state.is_running:
        raise HTTPException(status_code=409, detail="Simulation already running")
    city_state.is_running = True
    # APScheduler job interval is updated via the scheduler held in main.py
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


@router.get("/status")
async def simulation_status():
    return {
        "is_running": city_state.is_running,
        "simulation_day": city_state.simulation_day,
        "city_fund": round(city_state.city_fund, 2),
        "service_quality": round(city_state.service_quality, 2),
        "tax_rate": city_state.tax_rate,
    }
