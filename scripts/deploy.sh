#!/usr/bin/env bash
# Update a running deployment to the latest code on the current branch.
#   scripts/deploy.sh [env-file]        (default env file: ~/ai-city.env)
# Pulls, rebuilds the containers and waits for the backend health check.
set -euo pipefail

ENV_FILE="${1:-$HOME/ai-city.env}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -f "$ENV_FILE" ] || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }

# docker compose only reads ".env" on its own; the secrets live in $ENV_FILE and must be passed in.
grep -Eq '^GROQ_API_KEY_[123]=.+' "$ENV_FILE" \
  || echo "WARNING: no GROQ_API_KEY_* set in $ENV_FILE - citizens will use rule-based reactions, not the LLM" >&2

git pull --ff-only
docker compose --env-file "$ENV_FILE" up -d --build --remove-orphans

for i in $(seq 1 24); do
  if curl -sf http://localhost/api/health >/dev/null; then
    echo "Backend healthy"
    docker compose --env-file "$ENV_FILE" ps
    exit 0
  fi
  echo "Waiting for the backend... ($i)"
  sleep 5
done

echo "Backend did not become healthy" >&2
docker compose --env-file "$ENV_FILE" logs --tail=50 backend >&2
exit 1
