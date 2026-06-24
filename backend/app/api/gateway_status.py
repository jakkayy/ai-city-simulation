from fastapi import APIRouter

router = APIRouter(tags=["gateway"])


@router.get("/gateway/status")
async def get_gateway_status():
    return {"status": "not_initialized"}
