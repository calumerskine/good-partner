#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAESTRO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$MAESTRO_DIR/.env.maestro"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "❌  SUPABASE_SERVICE_ROLE_KEY is not set"
  echo "    Pass it as: SUPABASE_SERVICE_ROLE_KEY=<key> $0"
  exit 1
fi

echo "── Seeding E2E database ─────────────────────────────────────────────────────"
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" "$SCRIPT_DIR/seed-e2e-db.sh"

echo "── Running Maestro tests ────────────────────────────────────────────────────"
env_flags=()
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  env_flags+=("-e" "$key=$value")
done < "$ENV_FILE"

exit_code=0
for flow in "$MAESTRO_DIR/flows/auth"/*.yaml "$MAESTRO_DIR/flows/onboarding"/*.yaml; do
  [[ -f "$flow" ]] || continue
  maestro test "${env_flags[@]}" "$flow" || exit_code=$?
done
exit $exit_code
