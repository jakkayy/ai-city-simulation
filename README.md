# AI City Simulation

A simulated city of 50 AI citizen agents driven by LLMs (Groq). Each citizen has a job, a personality, savings and a happiness level of their own. You play the mayor: enact policies, watch how the citizens react and where they move, and see whether the city thrives or collapses. Everything is visible live on a dashboard.

## What is this for?

1. **Learning and showing off (portfolio).** It covers LLM agents, real-time systems (socket.io), an async backend, a database, Docker, CI and more than 240 tests. The interesting parts are the LLM gateway that rotates several API keys and manages their quotas, the rule-based fallback for when the LLM is unavailable, and the city-level agents.
2. **A playground for multi-agent AI.** See what collective behaviour comes out of 50 AIs reacting to the same events. Experiment with prompts, LLM cost/quota, and the choice between "let the AI think" and "use plain rules".
3. **A light game / educational toy.** Makes policy trade-offs visible: cut taxes and the fund drains, raise them and citizens get unhappy.

**Limitations.** There is a single city that everyone shares. The economy is a simple model whose numbers I tuned by simulating it myself (not based on real data), so this is a toy and an architecture example, not a tool for drawing reliable economic conclusions. There is no authentication: anyone who can reach the machine can control the city and spend your Groq quota, so run it locally or on a private network.

## Features

- **50 citizens**, each with a job, personality, savings, happiness and memory.
- **3 zones:** A (wealthy, capacity 15), B (middle class, 20), C (working class, 30). Citizens move between zones according to wealth and happiness; when a zone is full they wait in a queue.
- **Policies:** raise/lower taxes, boost/cut public services, a housing programme, a jobs programme.
- **City Manager:** proposes a policy every 7 days (via the LLM); enact it with one click from the dashboard.
- **Policy Advisor:** gives advice when the city falls into crisis (low average happiness).
- **Crisis system:** warning / critical / collapse alerts based on average happiness.
- **Replay:** play back from any saved day without calling the LLM and without touching the real data.
- **A restless economy:** each citizen's happiness depends on taxes, services, savings, the zone they live in and whether they have a job. There are random events (recession / boom / disaster / grant), people can lose their jobs or go bankrupt, and better services cost more to run.
- **City controls:** a slider sets the length of a city day (10 seconds to 10 minutes), and you can start a brand-new city from the page.
- **Easy to use:** the UI is in Thai with an EN switch; a guide opens from the "Guide" button (and appears by itself on the first visit); a one-sentence summary of the city's state, explanations of the numbers, and one-click suggested policies.
- **Citizen avatars:** generated in code (SVG), unique and stable per citizen ID. The face changes with happiness (smile / neutral / frown) and there are accessories by job (a hard hat for labourers, glasses for teachers, a tie for business owners). No external service involved.
- **A map you can zoom and fullscreen:** zoom (buttons / Ctrl + wheel / double-click / pinch), pan, focus on the city centre, and fullscreen. Around the city there is a river, bridges, a harbour, a school, a hospital, a factory and a farm; the badges show how many citizens really work there.
- **A living city:** city time follows the simulation day (1 day = 1 tick) with day, night, dawn and dusk; street lights and windows come on in the evening. In the morning citizens travel to work according to their real job (teachers → school, labourers → factory, farmers → farm, service workers → market, business owners/professionals → city centre, the unemployed → the park) and return in the evening; while they are out, their home dot fades.
- **End-of-day report:** every finished day the city summarises that day's numbers and events and stores them in the database. Browse them in the "Daily Reports" tab; notable days (a crisis, a city event, a big swing in happiness, several bankruptcies) pop up a summary. If a Groq key is set, an AI-written bulletin is added (Thai + English, one quota request per day, generated in the background so it never slows the city).
- **Real-time dashboard:** trend charts, a city map where citizens glide between zones, an event feed, and filters for the citizen list.

> Replay runs on an in-memory copy and never touches the real data. It plays out identically every time (seeded by the day). Only days saved after citizen state was added to the snapshots can be replayed.

## Architecture

```
Next.js (frontend) ──── nginx ──── FastAPI + socket.io (backend) ──── PostgreSQL
                                          │
                                   Groq LLM Gateway
                                  (up to 3 keys, round-robin)
```

- **Backend:** FastAPI, SQLAlchemy (async), Alembic, APScheduler, python-socketio
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **LLM:** Groq, `llama-3.3-70b-versatile` everywhere (citizens, City Manager, Advisor, the end-of-day bulletin). Quota: 90 RPM / 3000 RPD per key.
- **1 tick = 1 city day**, one minute by default (adjustable from 10 seconds to 10 minutes with the slider on the page). Order of a tick: economy → job market → migration → happiness → random city events → save snapshot → LLM reactions.

## Project structure

```
backend/app/
  main.py               FastAPI + socket.io, scheduler, startup (lifespan)
  api/                  REST endpoints
    simulation.py         start / stop / step / speed / status
    history.py            snapshots, replay, reset city
    policies.py  citizens.py  agents.py  gateway_status.py  reports.py
  simulation/           the game itself (no HTTP in here)
    loop.py               1 tick = 1 day: runs every step in order + broadcasts
    economy.py  happiness.py  zones.py  city_events.py   the city's rules
    policy_engine.py      validates policy parameters + predicts effects
    policy_effects.py     what a policy does to the city and the citizens
    snapshots.py          save / restore the city state (used by replay)
    crisis.py             crisis levels + the Policy Advisor's cooldown
    reports.py            end-of-day report + the LLM bulletin
    citizen_ai.py  fallback.py  gateway.py   LLM (citizens, rule-based fallback, key/quota rotation)
    agents/               City Manager, Policy Advisor, their state, JSON parsing
    state.py  constants.py  shared values and state
  models/  schemas/  db/  SQLAlchemy models, schemas, seed data
backend/tests/          pytest (191 tests, including a 600-day long-run simulation)

frontend/app/
  components/
    Dashboard.tsx         assembles the page
    header/               header: controls, speed slider, status, language
    stats/                stat cards, zones, city summary
    map/                  the map: CityMap (assembly) + Ground/Roads/ZonePanel/World/Districts/NightLayer ...
    citizens/             citizen list, cards, avatars
    feed/                 feed panel (live events + daily reports), day-summary popup, policy history
    panels/               enact policy, replay, AI status, guide
    ui/                   shared pieces: Select, Hint, Toasts, AnimatedNumber, Sparkline
  lib/
    useSimulation.ts      state + socket + REST for the whole page
    api.ts  types.ts  socket.ts  mood.ts  avatar.ts  events.ts  actions.ts  policies.ts
    i18n/                 th.ts, en.ts (keys must match; a test enforces it) + the hook
    map/                  map geometry (mapLayout, coreLayout), zoom/pan, time of day, commuting
  lib/**/__tests__/     vitest (89 tests)
scripts/                backup.sh / restore.sh / deploy.sh
```

Where things go: game values live in `constants.py` (backend). Every UI string goes in both `lib/i18n/th.ts` and `en.ts`. Map geometry lives in `lib/map/`, not inside components.

## Local development

### Requirements

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

# create backend/.env and put your Groq API keys in it
# (the backend reads .env from the folder you run uvicorn in)
cat > .env <<'EOF'
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=
GROQ_API_KEY_3=
EOF

alembic upgrade head
uvicorn app.main:socket_app --reload
```

- It runs without a Groq key; citizens then use the rule-based fallback instead of the LLM.
- On the first run, if the database is empty, 50 citizens are created automatically.
- Tables are created automatically at startup (`create_all`). The Alembic migration is currently empty, so `alembic upgrade head` does nothing yet, and if you later add a column to an existing table, `create_all` will not alter the old table: you have to write a migration yourself.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and press **Start** (or **Step** to advance one day at a time).

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL |
| `GROQ_API_KEY_1/2/3` | Groq API keys (up to 3, used in rotation) |
| `CORS_ORIGINS` | Allowed origins, comma-separated (default `http://localhost:3000`) |
| `ENV` | `development` or `production` |
| `NEXT_PUBLIC_API_URL` | Backend URL baked in when the frontend is built (empty = same origin through nginx) |

See `.env.production.example` for the full template.

## Deploying on a home server (Docker)

### First deploy (by hand)

```bash
git clone <repo> ai-city && cd ai-city
cp .env.production.example ~/ai-city.env
# edit ~/ai-city.env: set POSTGRES_PASSWORD and your real Groq keys
docker compose --env-file ~/ai-city.env up -d --build
```

nginx serves the frontend on port 80 and proxies `/api` and `/socket.io` to the backend. Check health at `http://localhost/api/health`.

> If this host already runs the stack, put `COMPOSE_PROJECT_NAME=<existing project name>` in `~/ai-city.env` (see `docker compose ls`). Otherwise Docker creates a new database volume and the existing city data will not be used.

### Updating a running deployment

```bash
scripts/deploy.sh      # git pull + rebuild + wait for the health check
```

The script warns if `~/ai-city.env` has no `GROQ_API_KEY_*` (citizens would then use the rule-based fallback instead of the LLM).

> `docker compose` only reads a file named `.env` by itself. This project's secrets file (`~/ai-city.env`) must always be passed with `--env-file`. If you forget, every key is empty and the LLM is silently never called. Check with `curl http://localhost/api/gateway/status`: `keys` must not be empty and `total_calls` must grow while the city runs.

There is no automatic CD. This repo is public, so letting GitHub run code on a machine at home (a self-hosted runner) is an unnecessary risk. Update by hand with the script above when you want to.

### Backup and restore

The city data lives in a PostgreSQL Docker volume on a single machine, so back it up:

```bash
scripts/backup.sh              # writes backups/aicity-<timestamp>.sql.gz and keeps the 14 newest (set KEEP=30 to keep more)
scripts/restore.sh backups/aicity-XXXX.sql.gz   # restore (REPLACES the current database)
```

Run it daily from cron (`crontab -e`):

```
30 3 * * * /path/to/ai-city/scripts/backup.sh >> /path/to/ai-city/backups/backup.log 2>&1
```

Also copy `backups/` to another machine or to the cloud: if the disk dies, backups on the same disk die with it.

## Running the tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

191 tests covering economy, zones, gateway, citizen AI, policy engine, agents, replay, end-of-day reports, and a long-run simulation (which checks that the economy does not collapse into a frozen state).

Frontend:

```bash
cd frontend
npx tsc --noEmit && npm run lint && npm test
```

## CI

`.github/workflows/ci.yml` runs on pushes to `develop`/`main` and on pull requests into `main`. It runs pytest for the backend, and the type-check, lint and tests for the frontend.

### Discord notifications

`.github/workflows/notify.yml` (a separate workflow, logic in `scripts/notify-discord.sh`) posts to a Discord channel through an incoming webhook:

| Event | Message |
|---|---|
| a pull request is opened or reopened | 📬 Opened / 🔁 Reopened PR #n |
| a pull request is merged | 🔀 Merged PR #n (closing without merging is silent) |
| CI fails (any branch, any event) | ❌ CI failed, with the names of the failed jobs |
| CI passes on a push to `main` | ✅ CI passed on main |

A green run on `develop` or on a pull request stays quiet, and so do cancelled or skipped runs (superseded by a newer push).

Setup:

1. In Discord: channel settings → Integrations → Webhooks → New Webhook → copy the URL.
2. In GitHub: repository → Settings → Secrets and variables → Actions → **Repository secrets** → New secret named `DISCORD_WEBHOOK_URL`. (An *environment* secret is not visible to this workflow.)

Notes:

- The CI messages use `workflow_run`, which GitHub only fires for workflow files on the default branch, so they start once `notify.yml` is on `main`. The pull request messages work as soon as the file is in the PR.
- Without the secret (pull requests from forks, Dependabot) every step skips quietly.
- The webhook URL is never printed; commit messages and PR titles reach the script as environment variables, only the first line is used, JSON is built by `jq`, and mentions are disabled (an `@everyone` in a commit message does not ping anyone). A Discord outage cannot fail the workflow.
- To try the script locally, set `MODE` and the variables listed at the top of `scripts/notify-discord.sh`.
