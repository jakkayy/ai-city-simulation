#!/usr/bin/env bash
# Dump the PostgreSQL database to backups/ and keep the newest N dumps.
#   scripts/backup.sh [env-file]        (default env file: ~/ai-city.env)
# Example cron (daily at 03:30):
#   30 3 * * * /path/to/ai-city/scripts/backup.sh >> /path/to/ai-city/backups/backup.log 2>&1
set -euo pipefail

ENV_FILE="${1:-$HOME/ai-city.env}"
KEEP="${KEEP:-14}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/backups"
mkdir -p "$OUT"

[ -f "$ENV_FILE" ] || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }

FILE="$OUT/aicity-$(date +%Y%m%d-%H%M%S).sql.gz"
cd "$ROOT"
docker compose --env-file "$ENV_FILE" exec -T db pg_dump -U aicity aicity_db | gzip > "$FILE"

# a failed dump leaves an almost-empty file; refuse to keep it
if [ "$(stat -c %s "$FILE")" -lt 200 ]; then
  rm -f "$FILE"
  echo "Backup looks empty, removed" >&2
  exit 1
fi

echo "Backup written: $FILE"
ls -1t "$OUT"/aicity-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
