#!/bin/bash
# Stop all Maxxed Out University dev servers
# Usage: ./stop-dev.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}Stopping Maxxed Out University dev services...${NC}"
echo ""

if [ ! -f "$PID_FILE" ]; then
  echo -e "${RED}No PID file found — nothing to stop.${NC}"
  echo -e "If processes are still running, try: ${YELLOW}pkill -f 'next dev'${NC}"
  exit 0
fi

while IFS= read -r line; do
  NAME="${line%%:*}"
  PID="${line##*:}"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    # Also kill child processes (next dev spawns children)
    pkill -P "$PID" 2>/dev/null
    echo -e "  ${GREEN}Stopped $NAME (PID $PID)${NC}"
  else
    echo -e "  ${YELLOW}$NAME (PID $PID) already stopped${NC}"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
rm -f "$SCRIPT_DIR/.university-dev.log"
rm -f "$SCRIPT_DIR/.funnel-dev.log"
rm -f "$SCRIPT_DIR/.stripe-listen.log"

echo ""
echo -e "${GREEN}All services stopped. Logs cleaned up.${NC}"
echo ""
