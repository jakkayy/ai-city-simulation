from fastapi import APIRouter
from app.simulation.agents import agent_status

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/status")
async def get_agent_status():
    return {
        "city_manager": {
            "last_run_day": agent_status.city_manager_last_run_day,
            "last_proposal": agent_status.city_manager_last_proposal,
        },
        "policy_advisor": {
            "last_crisis": agent_status.advisor_last_crisis,
            "last_advice": agent_status.advisor_last_advice,
        },
    }
