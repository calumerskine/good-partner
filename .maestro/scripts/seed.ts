// @ts-nocheck
// #!/usr/bin/env tsx
/**
 * E2E seed script — nukes and recreates users.
 * Reads env from app/.env (EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 */

import fs from "fs";
import path from "path";

// ── Env loading ───────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "../..");

function loadEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

const env = { ...loadEnv(path.join(ROOT, "app/.env")) };

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌  EXPO_PUBLIC_SUPABASE_URL not set in app/.env");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error(
    "❌  SUPABASE_SERVICE_ROLE_KEY not set (add to app/.env or pass as env var)"
  );
  process.exit(1);
}

const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const HEADERS = {
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function adminGet(path: string) {
  const res = await fetch(`${AUTH_URL}${path}`, { headers: HEADERS });
  return res.json();
}

async function adminPost(path: string, body: unknown) {
  const res = await fetch(`${AUTH_URL}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function adminDelete(path: string) {
  const res = await fetch(`${AUTH_URL}${path}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (res.status === 204) return {};
  return res.json();
}

async function restPost(table: string, body: unknown) {
  const res = await fetch(`${REST_URL}/${table}`, {
    method: "POST",
    headers: {
      ...HEADERS,
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Core operations ───────────────────────────────────────────────────────────

async function nukeUser(email: string): Promise<void> {
  // console.log(`  Nuking ${email} if exists...`);
  const data = await adminGet(
    `/admin/users?filter=${encodeURIComponent(email)}`
  );
  const userId: string | undefined = data?.users?.[0]?.id;
  if (!userId) {
    // console.log("  No existing user found");
    return;
  }
  // console.log(`  Deleting ${userId}...`);
  await adminDelete(`/admin/users/${userId}`);
  // console.log("  Deleted");
}

async function createOnboardedUser(email: string, password: string) {
  // console.log(`  Creating auth user ${email}...`);
  const user = await adminPost("/admin/users", {
    email,
    password,
    email_confirm: true,
    user_metadata: {},
  });

  const userId: string = user?.id;
  if (!userId) {
    console.error(`❌  Failed to create user. Response: ${JSON.stringify(user)}`);
    process.exit(1);
  }
  // console.log(`  ✓  Auth user: ${userId}`);

  // console.log("  Creating user_profile...");
  const profiles = await restPost("user_profiles", {
    user_id: userId,
    has_completed_onboarding: true,
    relationship_status: "great",
    gender: "man",
    timezone: "UTC",
    user_tier: "free",
    total_days_active: 0,
    current_streak_days: 0,
  });

  const profileId: string | undefined = Array.isArray(profiles)
    ? profiles[0]?.id
    : profiles?.id;

  if (!profileId) {
    console.error(`❌  Failed to create profile. Response: ${JSON.stringify(profiles)}`);
    process.exit(1);
  }
  // console.log(`  ✓  Profile: ${profileId}`);

  // console.log("  Upserting user_categories...");
  await fetch(`${REST_URL}/user_categories`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify([
      { profile_id: profileId, category_id: "00000000-0000-0000-0000-000000000001" },
      { profile_id: profileId, category_id: "00000000-0000-0000-0000-000000000002" },
    ]),
  });
  // console.log("  ✓  Categories seeded");

  return { userId, profileId };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const EMAIL = "empty-user@mail.com";
const PASSWORD = "password";

(async () => {
  console.log("");
  console.log("🌱  Seeding db...");

  await nukeUser(env.EXPO_PUBLIC_E2E_GOOGLE_EMAIL);
  await nukeUser(env.EXPO_PUBLIC_E2E_APPLE_EMAIL);
  await nukeUser(env.ONBOARDED_USER_EMAIL);
  await nukeUser(env.EMPTY_USER_EMAIL);
  await createOnboardedUser(env.EXPO_PUBLIC_E2E_GOOGLE_EMAIL, env.EXPO_PUBLIC_TEST_PASSWORD);
  await createOnboardedUser(env.EXPO_PUBLIC_E2E_APPLE_EMAIL, env.EXPO_PUBLIC_TEST_PASSWORD);
  await createOnboardedUser(env.ONBOARDED_USER_EMAIL, env.EXPO_PUBLIC_TEST_PASSWORD);

  console.log("");
  console.log("✅  Seed complete");
  console.log("");
})();
