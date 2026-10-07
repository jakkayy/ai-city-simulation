#!/usr/bin/env bash
# Post a GitHub event to Discord. Used by .github/workflows/notify.yml.
#
# Everything comes in through environment variables. Commit messages and PR titles are
# untrusted text, so they are never interpolated into this script or into JSON by hand:
# the payload is built with jq, which escapes it.
#
# This script never fails the workflow: a Discord outage must not turn anything red.
#
# Common
#   MODE                  pr | ci
#   DISCORD_WEBHOOK_URL   the secret; unset/empty (forks, Dependabot) = skip quietly
#
# MODE=pr  (a pull request was opened, reopened or closed)
#   ACTION  MERGED  NUMBER  TITLE  URL  AUTHOR  HEAD  BASE
#   Told: opened, reopened, merged. A PR closed without merging is not worth a message.
#
# MODE=ci  (the CI workflow finished)
#   CONCLUSION  EVENT (push | pull_request)  BRANCH  SHA  MESSAGE (commit message)  RUN_URL  ACTOR  REPO
#   FAILED_JOBS (optional)  names of the failed jobs, e.g. "Backend tests"
#   (if empty and GH_TOKEN + RUN_ID are set, the names are looked up with the GitHub CLI)
#   Told: every failure, and every green push to main. A green push to develop stays quiet,
#   and cancelled / skipped runs (superseded by a newer push) are ignored.

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

mode="${MODE:-}"

# ── decide what to say ────────────────────────────────────────────────────

title=""; subject=""; link=""; color=0
fields='[]'      # a JSON array of {name, value, inline}
footer=""

case "$mode" in
  pr)
    case "${ACTION:-}/${MERGED:-false}" in
      closed/true) title="🔀 Merged"; color=10181046 ;;
      closed/*)    echo "Pull request closed without merging: nothing to say."; exit 0 ;;
      reopened/*)  title="🔁 Reopened"; color=3447003 ;;
      opened/*)    title="📬 Opened"; color=3447003 ;;
      *)           echo "Pull request action '${ACTION:-}' is not announced."; exit 0 ;;
    esac
    title="$title PR #${NUMBER:-?}"
    subject="${TITLE:-}"
    link="${URL:-}"
    fields="$(jq -n --arg head "${HEAD:-?}" --arg base "${BASE:-?}" --arg by "${AUTHOR:--}" \
      '[{name:"Branch", value:($head + " → " + $base), inline:true}, {name:"By", value:$by, inline:true}]')"
    footer="${REPO:-}"
    ;;

  ci)
    conclusion="${CONCLUSION:-}"
    event="${EVENT:-push}"
    branch="${BRANCH:-unknown}"

    case "$conclusion" in
      success)
        if [ "$event" != push ] || [ "$branch" != main ]; then
          echo "Green run on '$branch' ($event): not notifying."
          exit 0
        fi
        title="✅ CI passed on main"; color=5763719
        ;;
      failure | timed_out | startup_failure)
        title="❌ CI failed"; color=15548997
        ;;
      *)
        echo "CI run ended as '$conclusion': not notifying."
        exit 0
        ;;
    esac

    failed="${FAILED_JOBS:-}"
    if [ -z "$failed" ] && [ "$conclusion" != success ] && [ -n "${GH_TOKEN:-}" ] && [ -n "${RUN_ID:-}" ] \
       && [ -n "${REPO:-}" ] && command -v gh >/dev/null 2>&1; then
      failed="$(gh api "repos/$REPO/actions/runs/$RUN_ID/jobs" \
        --jq '[.jobs[] | select(.conclusion == "failure") | .name] | join(", ")' 2>/dev/null || true)"
    fi

    subject="$(printf '%s' "${MESSAGE:-}" | head -n 1)"
    link="${RUN_URL:-}"
    fields="$(jq -n --arg branch "$branch" --arg by "${ACTOR:--}" --arg failed "$failed" \
      '[{name:"Branch", value:$branch, inline:true}, {name:"By", value:$by, inline:true}]
       + (if $failed != "" then [{name:"Failed", value:$failed, inline:false}] else [] end)')"
    footer="${REPO:-} · ${SHA:0:7}"
    ;;

  *)
    echo "Unknown MODE '$mode': skipping."
    exit 0
    ;;
esac

subject="${subject:0:200}"
[ -z "$subject" ] && subject="(no message)"

# ── send ──────────────────────────────────────────────────────────────────

payload="$(jq -n \
  --arg title "$title" \
  --arg subject "$subject" \
  --arg link "$link" \
  --arg footer "$footer" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson color "$color" \
  --argjson fields "$fields" \
  '{
    username: "GitHub",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: $title,
      description: $subject,
      url: (if $link != "" then $link else null end),
      color: $color,
      fields: $fields,
      footer: { text: $footer },
      timestamp: $ts
    }]
  }')" || { echo "Could not build the Discord payload: skipping."; exit 0; }

code="$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' \
  --header 'Content-Type: application/json' --data "$payload" "$url" 2>/dev/null)" || code="000"

case "$code" in
  2??) echo "Discord notification sent ($mode: $title)." ;;
  *) echo "Discord notification not delivered (HTTP $code); continuing." ;;
esac
exit 0
