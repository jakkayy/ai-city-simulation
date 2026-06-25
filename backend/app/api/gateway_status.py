from fastapi import APIRouter
from app.simulation.gateway import llm_gateway

router = APIRouter(tags=["gateway"])


@router.get("/gateway/status")
async def get_gateway_status():
    return llm_gateway.status()
