import socketio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import citizens, policies, gateway_status, simulation
from app.db.database import engine, Base
from app.simulation.gateway import build_gateway, llm_gateway as _gw_placeholder
from app.simulation.loop import restore_from_snapshot, run_tick, set_socket_server
import app.simulation.gateway as _gateway_module
from app.core.config import settings

app = FastAPI(title="AI City Simulation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

app.include_router(citizens.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(gateway_status.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")

_scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # initialise LLM gateway with configured API keys
    gateway = build_gateway(settings.groq_api_keys)
    _gateway_module.llm_gateway = gateway
    gateway.start()

    set_socket_server(sio)
    await restore_from_snapshot()

    _scheduler.add_job(run_tick, "interval", seconds=10, id="tick", max_instances=1)
    _scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    _scheduler.shutdown(wait=False)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
