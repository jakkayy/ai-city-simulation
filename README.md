# AI City Simulation

A simulated city with 50 AI citizen agents powered by Groq LLMs. Citizens react to city policies, migrate between zones, and generate real-time events — visible through a live dashboard.

## Architecture

```
Next.js (frontend) ──── nginx ──── FastAPI + socket.io (backend) ──── PostgreSQL
                                          │
                                   Groq LLM Gateway
                                  (3 keys, round-robin)
```

- **Backend**: FastAPI, SQLAlchemy async, Alembic, APScheduler, python-socketio
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **LLM**: Groq (llama-3.1-8b-instant), 3-account round-robin — 90 RPM / 3000 RPD per key
- **Simulation tick**: every 10 s (configurable), runs economy → migration → happiness → snapshot → LLM reactions

## Features

- **50 AI Citizens** — each with personality, job, zone, savings, and memory
- **Zone System** — Zone A (affluent), B (middle), C (working); citizens migrate based on finances
- **Policy Engine** — enact tax, service, housing, and job policies from the dashboard
- **City Manager Agent** — proposes policies every 7 days via LLM
- **Policy Advisor** — activates on crisis (avg happiness < 35), gives strategic advice
- **Replay Mode** — replay any past day deterministically without LLM calls
- **Crisis System** — warning / critical / collapse banners based on avg happiness

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# copy and fill in your Groq API keys
cp ../.env.production.example ../.env.development
# edit .env.development — add GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3

alembic upgrade head
uvicorn app.main:socket_app --reload
```

> Citizens are seeded automatically on first startup if the DB is empty.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL |
| `GROQ_API_KEY_1/2/3` | Groq API keys (up to 3 for round-robin) |
| `CORS_ORIGINS` | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `ENV` | `development` or `production` |
| `NEXT_PUBLIC_API_URL` | Backend URL baked at frontend build time (empty = same origin via nginx) |

See `.env.production.example` for the full template.

## Production Deployment (Docker)

```bash
# on the server
cp .env.production.example .env.production
# edit .env.production with real keys and passwords

docker compose up -d --build
```

nginx serves the frontend on port 80 and proxies `/api` and `/socket.io` to the backend.

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

122 tests across economy, zones, gateway, citizen AI, policy engine, agents, and replay.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs on push to `develop`/`main` and PRs to `main` — backend pytest + frontend type-check
- **CD** (`.github/workflows/cd.yml`): deploys to EC2 on push to `main` via SSH

Required GitHub Secrets: `EC2_HOST`, `EC2_USER`, `EC2_KEY`, `POSTGRES_PASSWORD`, `GROQ_API_KEY_1/2/3`
