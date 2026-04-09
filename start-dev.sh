#!/bin/bash
# Start all Maxxed Out University dev servers + Stripe webhook listener
# Usage: ./start-dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UNIVERSITY_DIR="$SCRIPT_DIR"
FUNNEL_DIR="$SCRIPT_DIR/../university-funnel"
PID_FILE="$SCRIPT_DIR/.dev-pids"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Maxxed Out University - Dev Startup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Clean up any previous run
if [ -f "$PID_FILE" ]; then
  echo -e "${YELLOW}Cleaning up previous dev session...${NC}"
  bash "$SCRIPT_DIR/stop-dev.sh" 2>/dev/null || true
fi

# ─── 1. /etc/hosts setup ───────────────────────────────────────────────

HOSTS_ENTRIES=(
  "127.0.0.1  blueprint.localhost"
  "127.0.0.1  mentorship.localhost"
  "127.0.0.1  donewithyou.localhost"
)

if grep -q "blueprint.localhost" /etc/hosts 2>/dev/null; then
  echo -e "${GREEN}/etc/hosts already configured${NC}"
else
  echo -e "${YELLOW}Adding funnel subdomains to /etc/hosts (requires sudo)...${NC}"
  echo "" | sudo tee -a /etc/hosts > /dev/null
  echo "# Maxxed Out University funnels (local dev)" | sudo tee -a /etc/hosts > /dev/null
  for entry in "${HOSTS_ENTRIES[@]}"; do
    echo "$entry" | sudo tee -a /etc/hosts > /dev/null
    echo -e "  Added: ${GREEN}$entry${NC}"
  done
fi

# ─── 2. Stripe webhook listener ────────────────────────────────────────

echo ""
echo -e "${CYAN}Starting Stripe webhook listener...${NC}"

# Start stripe listen in background, capture the webhook signing secret
STRIPE_LOG="$SCRIPT_DIR/.stripe-listen.log"
stripe listen --forward-to localhost:3000/api/webhooks/stripe > "$STRIPE_LOG" 2>&1 &
STRIPE_PID=$!
echo "stripe:$STRIPE_PID" > "$PID_FILE"

# Wait for the signing secret to appear in output
echo -n "  Waiting for webhook signing secret"
for i in $(seq 1 30); do
  SIGNING_SECRET=$(grep -oE 'whsec_[a-zA-Z0-9]+' "$STRIPE_LOG" 2>/dev/null | head -1)
  if [ -n "$SIGNING_SECRET" ]; then
    break
  fi
  echo -n "."
  sleep 1
done
echo ""

if [ -n "$SIGNING_SECRET" ]; then
  echo -e "  ${GREEN}Webhook secret: $SIGNING_SECRET${NC}"

  # Update .env.local in university project
  ENV_FILE="$UNIVERSITY_DIR/.env.local"
  if [ -f "$ENV_FILE" ]; then
    if grep -q "^STRIPE_WEBHOOK_SECRET=" "$ENV_FILE"; then
      # Replace existing value
      sed -i '' "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$SIGNING_SECRET|" "$ENV_FILE"
    else
      echo "STRIPE_WEBHOOK_SECRET=$SIGNING_SECRET" >> "$ENV_FILE"
    fi
  else
    echo "STRIPE_WEBHOOK_SECRET=$SIGNING_SECRET" > "$ENV_FILE"
  fi
  echo -e "  ${GREEN}Updated $ENV_FILE${NC}"
else
  echo -e "  ${RED}Could not capture signing secret (Stripe CLI may not be logged in)${NC}"
  echo -e "  ${YELLOW}Continuing without it — set STRIPE_WEBHOOK_SECRET manually if needed${NC}"
fi

# ─── 3. Start University (port 3000) ───────────────────────────────────

echo ""
echo -e "${CYAN}Starting Maxxed Out University on port 3000...${NC}"
cd "$UNIVERSITY_DIR"
npm run dev > "$SCRIPT_DIR/.university-dev.log" 2>&1 &
UNIVERSITY_PID=$!
echo "university:$UNIVERSITY_PID" >> "$PID_FILE"
echo -e "  ${GREEN}PID: $UNIVERSITY_PID${NC}"

# ─── 4. Start Funnel app (port 3001) ───────────────────────────────────

echo ""
echo -e "${CYAN}Starting Funnel app on port 3001...${NC}"
cd "$FUNNEL_DIR"
npm run dev > "$SCRIPT_DIR/.funnel-dev.log" 2>&1 &
FUNNEL_PID=$!
echo "funnel:$FUNNEL_PID" >> "$PID_FILE"
echo -e "  ${GREEN}PID: $FUNNEL_PID${NC}"

# ─── Done ───────────────────────────────────────────────────────────────

cd "$SCRIPT_DIR"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All services running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${CYAN}University:${NC}   http://localhost:3000"
echo -e "  ${CYAN}Blueprint:${NC}    http://blueprint.localhost:3001"
echo -e "  ${CYAN}Mentorship:${NC}   http://mentorship.localhost:3001"
echo -e "  ${CYAN}Done With You:${NC} http://donewithyou.localhost:3001"
echo -e "  ${CYAN}Stripe:${NC}       Forwarding to localhost:3000/api/webhooks/stripe"
echo ""
echo -e "  Logs:"
echo -e "    tail -f $SCRIPT_DIR/.university-dev.log"
echo -e "    tail -f $SCRIPT_DIR/.funnel-dev.log"
echo -e "    tail -f $STRIPE_LOG"
echo ""
echo -e "  ${YELLOW}Stop with: ./stop-dev.sh${NC}"
echo ""
