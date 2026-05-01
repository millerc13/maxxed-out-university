#!/usr/bin/env bash
# macOS ships /bin/bash 3.2.57. We use `wait -n` (added in 4.3), so if
# we're running on the old bash, re-exec under Homebrew's modern bash.
if [[ ${BASH_VERSINFO[0]:-3} -lt 4 && -x /opt/homebrew/bin/bash ]]; then
  exec /opt/homebrew/bin/bash "$0" "$@"
fi
if [[ ${BASH_VERSINFO[0]:-3} -lt 4 && -x /usr/local/bin/bash ]]; then
  exec /usr/local/bin/bash "$0" "$@"
fi

# Spin up both dev servers in one shot:
#   - university (this repo)              → http://localhost:3000
#   - university-funnel (sibling repo)    → http://*.localhost:3001
#
# Usage:
#   ./scripts/dev-all.sh        # logs streamed inline, Ctrl+C kills both
#
# Subdomain routing on the funnel uses *.localhost, so visit
#   http://blueprint.localhost:3001
#   http://mentorship.localhost:3001
#   http://donewithyou.localhost:3001
#   http://accelerator.localhost:3001
# (Most browsers route *.localhost to 127.0.0.1 automatically; if your
# Mac doesn't, add aliases to /etc/hosts.)

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNNEL_DIR="$(cd "$REPO_DIR/../university-funnel" 2>/dev/null && pwd || true)"

if [[ -z "$FUNNEL_DIR" || ! -d "$FUNNEL_DIR" ]]; then
  echo "❌ Could not find university-funnel sibling at $REPO_DIR/../university-funnel"
  echo "   Adjust the path in this script if your funnel repo lives elsewhere."
  exit 1
fi

# Kill any leftover dev servers from previous runs so ports stay free.
echo "→ Killing any stale dev servers…"
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1

UNI_LOG="$REPO_DIR/.university-dev.log"
FUNNEL_LOG="$FUNNEL_DIR/.funnel-dev.log"
: > "$UNI_LOG"
: > "$FUNNEL_LOG"

echo "→ Starting university (port 3000) — logs: $UNI_LOG"
( cd "$REPO_DIR" && npm run dev > "$UNI_LOG" 2>&1 ) &
UNI_PID=$!

echo "→ Starting funnel     (port 3001) — logs: $FUNNEL_LOG"
( cd "$FUNNEL_DIR" && npm run dev > "$FUNNEL_LOG" 2>&1 ) &
FUNNEL_PID=$!

cleanup() {
  echo ""
  echo "→ Caught exit signal — stopping dev servers…"
  kill "$UNI_PID" "$FUNNEL_PID" 2>/dev/null || true
  # Give Next a moment to shut down its workers, then nuke any stragglers.
  sleep 1
  pkill -P "$UNI_PID" 2>/dev/null || true
  pkill -P "$FUNNEL_PID" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-server" 2>/dev/null || true
  echo "→ Done."
}
trap cleanup EXIT INT TERM

echo ""
echo "✓ Both dev servers starting up. Tailing logs (Ctrl+C to stop both)."
echo ""

# Stream both logs, prefixed so it's clear which is which.
( tail -f "$UNI_LOG"    | sed -u 's/^/[uni]    /' ) &
TAIL_UNI=$!
( tail -f "$FUNNEL_LOG" | sed -u 's/^/[funnel] /' ) &
TAIL_FUNNEL=$!

# Wait until both Next servers print "Ready" (fallback: both processes
# stayed alive for 60s so we don't hang forever if the matcher misses).
wait_ready() {
  local log="$1" name="$2"
  local deadline=$(( $(date +%s) + 60 ))
  while [[ $(date +%s) -lt $deadline ]]; do
    if grep -qE "Ready in|started server|Local:" "$log" 2>/dev/null; then return 0; fi
    sleep 0.5
  done
  echo "(warning: $name didn't print Ready within 60s — banner might be premature)"
  return 1
}
wait_ready "$UNI_LOG" "university" >/dev/null 2>&1
wait_ready "$FUNNEL_LOG" "funnel" >/dev/null 2>&1

# Pause briefly so the banner doesn't get buried under the last burst
# of compile output streaming through the tails.
sleep 1
cat <<'BANNER'

╭───────────────────────────────────────────────────────────────────╮
│  🚀  Both dev servers are up. Open these in your browser:         │
├───────────────────────────────────────────────────────────────────┤
│  University                                                       │
│    http://localhost:3000                  (catalog / dashboard)   │
│    http://localhost:3000/admin            (admin panel)           │
│    http://localhost:3000/login            (login)                 │
│                                                                   │
│  Funnels                                                          │
│    http://blueprint.localhost:3001        (Empire Blueprint)      │
│    http://mentorship.localhost:3001       (6-Month Mentorship)    │
│    http://donewithyou.localhost:3001      (Done With You)         │
│    http://accelerator.localhost:3001      (Business Accelerator)  │
│                                                                   │
│  Ctrl+C in this terminal stops BOTH servers.                      │
╰───────────────────────────────────────────────────────────────────╯

BANNER

# Wait on either dev server. If one dies, exit (cleanup trap kills the other).
wait -n "$UNI_PID" "$FUNNEL_PID"
EXIT_CODE=$?

kill "$TAIL_UNI" "$TAIL_FUNNEL" 2>/dev/null || true
exit "$EXIT_CODE"
