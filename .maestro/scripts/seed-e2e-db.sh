#!/usr/bin/env bash
# seed-e2e-db.sh — Populate Supabase with all users required for E2E Maestro flows.
#
# Always resets (deletes + recreates) the onboarded test user for a clean state.
# Safe to run multiple times — idempotent.
#
# Permutations created:
#   1. Onboarded user (TEST_EMAIL / TEST_PASSWORD)
#      Used by: auth/01-signin-email, auth/03-validation-errors, auth/04-google-signin, auth/05-apple-signin
#      Profile: has_completed_onboarding=true, relationship_status="great", gender="man"
#      Categories: ATTENTION + AFFECTION (IDs from seed data)
#
# New-user flows (auth/02-signup-email, onboarding/*) create fresh accounts per run — no seeding needed.
#
# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=<key> ./.maestro/scripts/seed-e2e-db.sh
#
# Required env vars:
#   SUPABASE_SERVICE_ROLE_KEY  — service_role key (never commit this)
#
# Sourced automatically (if present):
#   .maestro/.env.maestro      — TEST_EMAIL, TEST_PASSWORD
#   app/.env                   — EXPO_PUBLIC_SUPABASE_URL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Load env files ────────────────────────────────────────────────────────────

load_dotenv() {
  local file="$1"
  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      # Only export lines that look like KEY=VALUE
      if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
        export "${line?}"
      fi
    done < "$file"
  fi
}

load_dotenv "$ROOT_DIR/.maestro/.env.maestro"
load_dotenv "$ROOT_DIR/app/.env"

# ── Resolve required vars ─────────────────────────────────────────────────────

SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
TEST_EMAIL="${TEST_EMAIL:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"
NEW_USER_EMAIL="${NEW_USER_EMAIL:-}"

if [[ -z "$SUPABASE_URL" ]]; then
  echo "❌  EXPO_PUBLIC_SUPABASE_URL is not set (check app/.env)" >&2; exit 1
fi
if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "❌  SUPABASE_SERVICE_ROLE_KEY is not set" >&2
  echo "    Pass it as: SUPABASE_SERVICE_ROLE_KEY=<key> $0" >&2; exit 1
fi
if [[ -z "$TEST_EMAIL" || -z "$TEST_PASSWORD" ]]; then
  echo "❌  TEST_EMAIL and TEST_PASSWORD must be set (check .maestro/.env.maestro)" >&2; exit 1
fi
if [[ -z "$NEW_USER_EMAIL" ]]; then
  echo "❌  NEW_USER_EMAIL must be set (check .maestro/.env.maestro)" >&2; exit 1
fi

AUTH_URL="$SUPABASE_URL/auth/v1"
REST_URL="$SUPABASE_URL/rest/v1"
ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}"

AUTH_HEADER="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
APIKEY_HEADER="apikey: $SUPABASE_SERVICE_ROLE_KEY"
CT_HEADER="Content-Type: application/json"

# ── Helpers ───────────────────────────────────────────────────────────────────

curl_admin() {
  curl --silent --show-error \
    -H "$AUTH_HEADER" \
    -H "$APIKEY_HEADER" \
    -H "$CT_HEADER" \
    "$@"
}

rest_post() {
  local table="$1"; shift
  curl --silent --show-error \
    -X POST \
    -H "$AUTH_HEADER" \
    -H "$APIKEY_HEADER" \
    -H "$CT_HEADER" \
    -H "Prefer: return=representation,resolution=ignore-duplicates" \
    "$REST_URL/$table" \
    "$@"
}

rest_get() {
  local table="$1"; shift
  curl --silent --show-error \
    -H "$AUTH_HEADER" \
    -H "$APIKEY_HEADER" \
    "$REST_URL/$table" \
    "$@"
}

check_error() {
  local response="$1"
  local context="$2"
  if echo "$response" | grep -q '"code":\|"error":\|"message":' 2>/dev/null; then
    # Only treat as error if there's an actual error code field (not just any message)
    if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'error' in d or ('code' in d and d.get('code') not in [None,'']) else 1)" 2>/dev/null; then
      echo "❌  Error in $context: $response" >&2
      exit 1
    fi
  fi
}

# ── Category IDs from seed data (deterministic) ───────────────────────────────
#
# These match the UUIDs in supabase/migrations/20231129000000_seed.sql
CAT_ATTENTION="00000000-0000-0000-0000-000000000001"
CAT_AFFECTION="00000000-0000-0000-0000-000000000002"
CAT_INITIATIVE="00000000-0000-0000-0000-000000000003"
CAT_REPAIR="00000000-0000-0000-0000-000000000004"

nuke_user() {
  local email="$1"
  local label="$2"
  echo "  Nuking $label ($email) if exists..."
  local encoded
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$email'))")
  local existing
  existing=$(curl_admin "$AUTH_URL/admin/users?filter=$encoded" | \
    python3 -c "import sys,json; users=json.load(sys.stdin).get('users',[]); print(users[0]['id'] if users else '')" 2>/dev/null || true)
  if [[ -n "$existing" ]]; then
    echo "  Deleting $existing..."
    local delete_response
    delete_response=$(curl_admin -X DELETE "$AUTH_URL/admin/users/$existing")
    if echo "$delete_response" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('error') or d.get('code') else 1)" 2>/dev/null; then
      echo "❌  Delete failed: $delete_response" >&2; exit 1
    fi
    echo "  Deleted"
  else
    echo "  No existing user found"
  fi
}

# ── Permutation 1: Onboarded user ─────────────────────────────────────────────

echo ""
echo "── Permutation 1: Onboarded user ($TEST_EMAIL) ──────────────────────────"
nuke_user "$TEST_EMAIL" "onboarded user"

# ── Permutation 2: New user (sign-up flow) ────────────────────────────────────

echo ""
echo "── Permutation 2: New user ($NEW_USER_EMAIL) ────────────────────────────"
nuke_user "$NEW_USER_EMAIL" "new user"

# Create auth user
echo "  Creating auth user..."
create_response=$(curl_admin \
  -X POST "$AUTH_URL/admin/users" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {}
  }")
USER_ID=$(echo "$create_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [[ -z "$USER_ID" ]]; then
  echo "❌  Failed to get user ID. Response: $create_response" >&2
  exit 1
fi

echo "  ✓  Auth user: $USER_ID"

echo "  Creating user_profile..."
profile_response=$(rest_post "user_profiles" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"has_completed_onboarding\": true,
    \"relationship_status\": \"great\",
    \"gender\": \"man\",
    \"timezone\": \"UTC\",
    \"user_tier\": \"free\",
    \"total_days_active\": 0,
    \"current_streak_days\": 0
  }")

PROFILE_ID=$(echo "$profile_response" | python3 -c \
  "import sys,json; rows=json.load(sys.stdin); print(rows[0]['id'] if isinstance(rows,list) and rows else rows.get('id',''))" 2>/dev/null || true)

if [[ -z "$PROFILE_ID" ]]; then
  echo "❌  Failed to create profile. Response: $profile_response" >&2
  exit 1
fi
echo "  Profile: $PROFILE_ID"

# Upsert user_categories (ATTENTION + AFFECTION)
echo "  Upserting user_categories..."
categories_response=$(rest_post "user_categories" \
  -H "Prefer: return=minimal,resolution=ignore-duplicates" \
  -d "[
    {\"profile_id\": \"$PROFILE_ID\", \"category_id\": \"$CAT_ATTENTION\"},
    {\"profile_id\": \"$PROFILE_ID\", \"category_id\": \"$CAT_AFFECTION\"}
  ]")
echo "  ✓  Categories seeded"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "✅  Seed complete"
echo ""
echo "  Permutation 1 — Onboarded user"
echo "    Email:    $TEST_EMAIL"
echo "    Password: $TEST_PASSWORD"
echo "    User ID:  $USER_ID"
echo "    Profile:  $PROFILE_ID"
echo "    Used by:  auth/01-signin-email, auth/03-validation-errors,"
echo "              auth/04-google-signin, auth/05-apple-signin"
echo ""
echo "  Permutation 2 — New user (deleted for fresh sign-up)"
echo "    Email:    $NEW_USER_EMAIL"
echo "    Used by:  auth/02-signup-email, onboarding/happy-path"
echo ""
