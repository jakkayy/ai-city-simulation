import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import citizens, policies, gateway_status
from app.db.database import engine, Base

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


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
