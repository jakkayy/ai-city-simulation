#!/usr/bin/env bash
# Restore a dump made by backup.sh. THIS REPLACES THE CURRENT DATABASE CONTENT.
#   scripts/restore.sh backups/aicity-YYYYMMDD-HHMMSS.sql.gz [env-file]
set -euo pipefail

DUMP="${1:?usage: restore.sh <dump.sql.gz> [env-file]}"
ENV_FILE="${2:-$HOME/ai-city.env}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

read -r -p "Replace the current database with $DUMP? [y/N] " yn
[ "$yn" = "y" ] || { echo "Aborted"; exit 1; }

docker compose --env-file "$ENV_FILE" stop backend
docker compose --env-file "$ENV_FILE" exec -T db psql -U aicity -d postgres -c "DROP DATABASE IF EXISTS aicity_db WITH (FORCE);" -c "CREATE DATABASE aicity_db;"
gunzip -c "$DUMP" | docker compose --env-file "$ENV_FILE" exec -T db psql -U aicity -d aicity_db
docker compose --env-file "$ENV_FILE" start backend
echo "Restored from $DUMP"
