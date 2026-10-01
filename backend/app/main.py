import logging
from contextlib import asynccontextmanager

import socketio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api import agents, citizens, gateway_status, history, policies, reports, simulation
from app.db.database import engine, Base, AsyncSessionLocal
from app.db.seed import seed_citizens
from app.models.citizen import Citizen
from app.simulation.gateway import build_gateway
from app.simulation.loop import run_tick, set_socket_server
from app.simulation.snapshots import restore_from_snapshot
from app.simulation.state import city_state
import app.simulation.gateway as _gateway_module
from app.core.config import settings

logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler()


def get_scheduler() -> AsyncIOScheduler:
    return _scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # auto-seed 50 citizens on first run (idempotent if citizens already exist)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Citizen).limit(1))
        if result.scalar_one_or_none() is None:
            logger.info("No citizens found — seeding initial 50 citizens")
            await seed_citizens(db)

    gateway = build_gateway(settings.groq_api_keys)
    _gateway_module.llm_gateway = gateway
    gateway.start()

    set_socket_server(sio)
    await restore_from_snapshot()

    _scheduler.add_job(
        run_tick, "interval", seconds=city_state.tick_interval_seconds, id="tick", max_instances=1
    )
    _scheduler.start()

    yield

    _scheduler.shutdown(wait=False)


app = FastAPI(title="AI City Simulation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

app.include_router(citizens.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(gateway_status.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(agents.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
