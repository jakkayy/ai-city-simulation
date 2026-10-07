#!/usr/bin/env bash
# Post the result of a CI run to Discord. Used by .github/workflows/ci.yml.
#
# Everything comes in through environment variables. Commit messages and PR titles are
# untrusted text, so they are never interpolated into this script or into JSON by hand:
# the payload is built with jq, which escapes it.
#
# This script never fails the pipeline: a Discord outage must not turn CI red.
#
#   DISCORD_WEBHOOK_URL   the secret; unset/empty (forks, Dependabot) = skip quietly
#   BACKEND_RESULT        result of the backend job   (success | failure | cancelled | skipped)
#   FRONTEND_RESULT       result of the frontend job
#   EVENT_NAME            push | pull_request
#   BRANCH                branch name (head branch for pull requests)
#   ACTOR  REPO  SHA  RUN_URL  MESSAGE (commit message)  PR_NUMBER  PR_TITLE  PR_URL
#
# Who gets told: every failure or cancellation, every pull request, and every push to main.
# A green push to develop stays quiet.

set -uo pipefail

url="${DISCORD_WEBHOOK_URL:-}"
if [ -z "$url" ]; then
  echo "No DISCORD_WEBHOOK_URL secret available: skipping the Discord notification."
  exit 0
fi

# Only ever talk to Discord (loopback is allowed so this script can be tested locally).
case "$url" in
  https://discord.com/api/webhooks/* | https://discordapp.com/api/webhooks/* | http://127.0.0.1:* | http://localhost:*) ;;
  *)
    echo "DISCORD_WEBHOOK_URL is not a Discord webhook URL: skipping."
    exit 0
    ;;
esac

backend="${BACKEND_RESULT:-skipped}"
frontend="${FRONTEND_RESULT:-skipped}"

if [ "$backend" = failure ] || [ "$frontend" = failure ]; then
  overall=failure
elif [ "$backend" = cancelled ] || [ "$frontend" = cancelled ]; then
  overall=cancelled
elif [ "$backend" = skipped ] && [ "$frontend" = skipped ]; then
  echo "Nothing ran: skipping the Discord notification."
  exit 0
else
  overall=success
fi

event="${EVENT_NAME:-push}"
branch="${BRANCH:-unknown}"

if [ "$overall" = success ] && [ "$event" = push ] && [ "$branch" != main ]; then
  echo "Green push to '$branch': not notifying."
  exit 0
fi

icon() {
  case "$1" in
    success) echo "✅" ;;
    failure) echo "❌" ;;
    cancelled) echo "⚠️" ;;
    *) echo "➖" ;;
  esac
}

case "$overall" in
  success) title="✅ CI passed"; color=3066993 ;;
  failure) title="❌ CI failed"; color=15158332 ;;
  *) title="⚠️ CI cancelled"; color=16098851 ;;
esac

# first line only, trimmed
if [ "$event" = pull_request ] && [ -n "${PR_TITLE:-}" ]; then
  subject="PR #${PR_NUMBER:-?}: ${PR_TITLE}"
  link="${PR_URL:-${RUN_URL:-}}"
else
  subject="$(printf '%s' "${MESSAGE:-}" | head -n 1)"
  link="${RUN_URL:-}"
fi
subject="${subject:0:200}"
[ -z "$subject" ] && subject="(no message)"

payload="$(jq -n \
  --arg title "$title" \
  --arg subject "$subject" \
  --arg link "$link" \
  --arg runurl "${RUN_URL:-}" \
  --arg repo "${REPO:-}" \
  --arg branch "$branch" \
  --arg actor "${ACTOR:-}" \
  --arg sha "${SHA:0:7}" \
  --arg backend "$(icon "$backend") backend: $backend" \
  --arg frontend "$(icon "$frontend") frontend: $frontend" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson color "$color" \
  '{
    username: "CI",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: $title,
      description: $subject,
      url: (if $link != "" then $link else null end),
      color: $color,
      fields: [
        { name: "Branch", value: $branch, inline: true },
        { name: "By", value: (if $actor != "" then $actor else "-" end), inline: true },
        { name: "Jobs", value: ($backend + "\n" + $frontend + (if $runurl != "" then "\n[Open the run](" + $runurl + ")" else "" end)), inline: false }
      ],
      footer: { text: ($repo + " · " + $sha) },
      timestamp: $ts
    }]
  }')" || { echo "Could not build the Discord payload: skipping."; exit 0; }

code="$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' \
  --header 'Content-Type: application/json' --data "$payload" "$url" 2>/dev/null)" || code="000"

case "$code" in
  2??) echo "Discord notification sent ($overall)." ;;
  *) echo "Discord notification not delivered (HTTP $code); continuing." ;;
esac
exit 0
