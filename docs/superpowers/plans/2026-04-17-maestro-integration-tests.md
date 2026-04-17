# Maestro Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write Maestro E2E integration tests covering onboarding, email auth, and social sign-ins (Google + Apple), runnable locally and in GitHub Actions CI.

**Architecture:** Flows live in `.maestro/flows/` grouped by feature area; reusable setup/teardown sub-flows in `.maestro/utils/`; social sign-ins use an `EXPO_PUBLIC_E2E=true` bypass in `use-auth.tsx` so CI doesn't need real OAuth accounts. Tests run against the dev Supabase instance using dedicated test accounts stored in `.env.maestro` locally and GitHub Actions secrets in CI.

**Tech Stack:** Maestro CLI, Maestro YAML flows, Expo iOS simulator (iPhone 16), GitHub Actions `macos-latest` runner, EAS build for CI app binary.

---

## File Structure

### New Files

```
.maestro/
  config.yaml                                 # App ID + global timeouts
  .env.maestro                                # Local test credentials (gitignored)
  utils/
    launch.yaml                               # Clear state + launch app
    signin.yaml                               # Reusable sign-in sub-flow
    signout.yaml                              # Reusable sign-out sub-flow
  flows/
    onboarding/
      01-welcome.yaml
      02-transition.yaml
      03-relationship.yaml
      04-focus.yaml
      05-gender.yaml
      06-auth-email.yaml
      happy-path.yaml                         # Composes all onboarding flows end-to-end
    auth/
      01-signin-email.yaml
      02-signup-email.yaml
      03-validation-errors.yaml
      04-google-signin.yaml
      05-apple-signin.yaml
.github/
  workflows/
    e2e.yml
```

### Modified Files

```
app/components/ui/input.tsx       # Pass testID={name} through to TextInput
app/hooks/use-auth.tsx            # Add EXPO_PUBLIC_E2E bypass for social auth
```

---

## Task 1: Install Maestro CLI & Scaffold Directory Structure

**Files:**
- Create: `.maestro/config.yaml`
- Create: `.maestro/.env.maestro` (gitignored)

- [ ] **Step 1: Install Maestro CLI**

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Expected: `maestro installed to ~/.maestro/bin/maestro`

Add to shell profile if not auto-added:
```bash
export PATH="$HOME/.maestro/bin:$PATH"
```

Verify:
```bash
maestro --version
```

Expected: `1.39.x` or later

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p .maestro/flows/onboarding .maestro/flows/auth .maestro/utils
```

- [ ] **Step 3: Create `.maestro/config.yaml`**

```yaml
# .maestro/config.yaml
---
appId: com.pearprogramming.wingmanapp
```

- [ ] **Step 4: Create `.maestro/.env.maestro` with test credentials**

```bash
# .maestro/.env.maestro — DO NOT COMMIT
TEST_EMAIL=e2e-test@yourdomain.com
TEST_PASSWORD=e2eTestPassword123
```

Create the test account in your dev Supabase instance now by signing up once manually through the app.

- [ ] **Step 5: Add `.maestro/.env.maestro` to `.gitignore`**

Append to the root `.gitignore`:
```
.maestro/.env.maestro
```

- [ ] **Step 6: Commit**

```bash
git add .maestro/config.yaml .gitignore
git commit -m "chore: add Maestro E2E test scaffold"
```

---

## Task 2: Add `testID` to Input Component

**Files:**
- Modify: `app/components/ui/input.tsx`

The `Input` component passes `id={name}` to `TextInput`. React Native ignores `id` for automation — `testID` is required. Maestro can also find inputs by placeholder, but `testID` is more robust.

- [ ] **Step 1: Add `testID` prop to both `TextInput` renders in `app/components/ui/input.tsx`**

In the `outlined` variant render (line 49), change:
```tsx
<TextInput
  ref={inputRef}
  id={name}
```
to:
```tsx
<TextInput
  ref={inputRef}
  id={name}
  testID={name}
```

In the default variant render (line 71), change:
```tsx
<TextInput
  ref={inputRef}
  id={name}
```
to:
```tsx
<TextInput
  ref={inputRef}
  id={name}
  testID={name}
```

- [ ] **Step 2: Verify the Input component type still accepts `testID`**

`testID` is part of `TextInputProps` (via `ViewProps`) and is already accepted through `...rest`. No type changes needed.

- [ ] **Step 3: Run TypeScript check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/input.tsx
git commit -m "chore: add testID to Input component for E2E testing"
```

---

## Task 3: Create Reusable Launch & Teardown Flows

**Files:**
- Create: `.maestro/utils/launch.yaml`
- Create: `.maestro/utils/signout.yaml`

- [ ] **Step 1: Create `.maestro/utils/launch.yaml`**

```yaml
# .maestro/utils/launch.yaml
appId: com.pearprogramming.wingmanapp
---
- launchApp:
    clearState: true
```

This clears all app state (Supabase session in AsyncStorage) before each test run, ensuring a clean slate.

- [ ] **Step 2: Create `.maestro/utils/signout.yaml`**

This is used to sign out a logged-in user so other tests can start fresh without clearing state:

```yaml
# .maestro/utils/signout.yaml
appId: com.pearprogramming.wingmanapp
---
- tapOn:
    text: "Settings"
    optional: true
- scrollUntilVisible:
    element:
      text: "Sign Out"
    direction: DOWN
    optional: true
- tapOn:
    text: "Sign Out"
    optional: true
```

> Note: Update element labels here once the Settings tab UI is explored. The `optional: true` flag prevents failure if the button isn't visible (e.g., already signed out).

- [ ] **Step 3: Commit**

```bash
git add .maestro/utils/
git commit -m "chore: add Maestro launch and signout utility flows"
```

---

## Task 4: Write Onboarding Welcome Flow

**Files:**
- Create: `.maestro/flows/onboarding/01-welcome.yaml`

- [ ] **Step 1: Boot the iOS simulator and run the app**

```bash
cd app && npx expo run:ios
```

Wait for Metro bundler and simulator to load. Confirm you see the Welcome screen on fresh install.

- [ ] **Step 2: Create `.maestro/flows/onboarding/01-welcome.yaml`**

```yaml
# .maestro/flows/onboarding/01-welcome.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Welcome screen
- assertVisible: "Welcome to"
- assertVisible: "The Good Partner"
- tapOn: "Get Started"

# Should advance to transition step
- assertVisible: "Three quick questions"
```

- [ ] **Step 3: Run the flow against the simulator**

```bash
maestro test .maestro/flows/onboarding/01-welcome.yaml
```

Expected output:
```
✅ Launch app
✅ assertVisible: "Welcome to"
✅ assertVisible: "The Good Partner"
✅ tapOn: "Get Started"
✅ assertVisible: "Three quick questions"
```

Fix any selector mismatches before continuing.

- [ ] **Step 4: Commit**

```bash
git add .maestro/flows/onboarding/01-welcome.yaml
git commit -m "test(e2e): add onboarding welcome flow"
```

---

## Task 5: Write Onboarding Transition & Relationship Flows

**Files:**
- Create: `.maestro/flows/onboarding/02-transition.yaml`
- Create: `.maestro/flows/onboarding/03-relationship.yaml`

- [ ] **Step 1: Create `.maestro/flows/onboarding/02-transition.yaml`**

```yaml
# .maestro/flows/onboarding/02-transition.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate to transition step
- tapOn: "Get Started"
- assertVisible: "Three quick questions"

# Tap Continue to advance
- tapOn: "Continue"

# Should reach relationship step
- assertVisible: "How would you describe your relationship"
```

- [ ] **Step 2: Create `.maestro/flows/onboarding/03-relationship.yaml`**

```yaml
# .maestro/flows/onboarding/03-relationship.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate through welcome and transition
- tapOn: "Get Started"
- tapOn: "Continue"
- assertVisible: "How would you describe your relationship"

# Continue button should be disabled until option selected
- assertNotVisible: "Please select an option to continue"
- tapOn: "Continue"
- assertVisible: "Please select an option to continue"

# Select a relationship option
- tapOn: "Mostly solid, but I sense some distance"

# Continue button should now be enabled
- tapOn: "Continue"

# Should advance to focus step
- assertVisible: "What would you like to focus on"
```

- [ ] **Step 3: Run both flows**

```bash
maestro test .maestro/flows/onboarding/02-transition.yaml
maestro test .maestro/flows/onboarding/03-relationship.yaml
```

Expected: both flows pass with green checkmarks.

- [ ] **Step 4: Commit**

```bash
git add .maestro/flows/onboarding/02-transition.yaml .maestro/flows/onboarding/03-relationship.yaml
git commit -m "test(e2e): add onboarding transition and relationship flows"
```

---

## Task 6: Write Onboarding Focus & Gender Flows

**Files:**
- Create: `.maestro/flows/onboarding/04-focus.yaml`
- Create: `.maestro/flows/onboarding/05-gender.yaml`

- [ ] **Step 1: Create `.maestro/flows/onboarding/04-focus.yaml`**

```yaml
# .maestro/flows/onboarding/04-focus.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate to focus step
- tapOn: "Get Started"
- tapOn: "Continue"
- tapOn: "Mostly solid, but I sense some distance"
- tapOn: "Continue"
- assertVisible: "What would you like to focus on"

# Continue should be disabled with nothing selected
- tapOn: "Continue"
- assertVisible: "Please select at least one area to continue"

# Select a focus area
- tapOn: "Being more present & connected"

# Select a second focus area (multi-select)
- tapOn: "Showing more affection & appreciation"

# Continue should now work
- tapOn: "Continue"

# Should advance to gender step
- assertVisible: "About you"
```

- [ ] **Step 2: Create `.maestro/flows/onboarding/05-gender.yaml`**

```yaml
# .maestro/flows/onboarding/05-gender.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate to gender step
- tapOn: "Get Started"
- tapOn: "Continue"
- tapOn: "Mostly solid, but I sense some distance"
- tapOn: "Continue"
- tapOn: "Being more present & connected"
- tapOn: "Continue"
- assertVisible: "About you"

# Continue should be disabled until option selected
- tapOn: "Continue"
- assertVisible: "Please select an option to continue"

# Select gender
- tapOn: "Prefer not to say"

# Continue should now work
- tapOn: "Continue"

# Should advance to account creation step
- assertVisible: "You're all set."
```

- [ ] **Step 3: Run both flows**

```bash
maestro test .maestro/flows/onboarding/04-focus.yaml
maestro test .maestro/flows/onboarding/05-gender.yaml
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add .maestro/flows/onboarding/04-focus.yaml .maestro/flows/onboarding/05-gender.yaml
git commit -m "test(e2e): add onboarding focus and gender flows"
```

---

## Task 7: Write Onboarding Email Auth Step Flow

**Files:**
- Create: `.maestro/flows/onboarding/06-auth-email.yaml`

This flow completes the full onboarding and creates a real Supabase account using the test credentials. It runs against the dev Supabase instance.

- [ ] **Step 1: Create `.maestro/flows/onboarding/06-auth-email.yaml`**

```yaml
# .maestro/flows/onboarding/06-auth-email.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate through onboarding to auth step
- tapOn: "Get Started"
- tapOn: "Continue"
- tapOn: "Mostly solid, but I sense some distance"
- tapOn: "Continue"
- tapOn: "Being more present & connected"
- tapOn: "Continue"
- tapOn: "Prefer not to say"
- tapOn: "Continue"
- assertVisible: "You're all set."
- assertVisible: "Create your account to save your progress."

# Enter email
- tapOn:
    id: "email"
- inputText: ${TEST_EMAIL}

# Enter password
- tapOn:
    id: "password"
- inputText: ${TEST_PASSWORD}

# Submit
- tapOn: "Continue with email"

# Should land on main app (tabs)
- assertVisible: "Today"
```

> **Note:** `assertVisible: "Today"` assumes the home tab shows a "Today" heading. Verify this and update the assertion to match the actual first screen after onboarding.

- [ ] **Step 2: Run with test credentials**

```bash
maestro test --env TEST_EMAIL=e2e-test@yourdomain.com --env TEST_PASSWORD=e2eTestPassword123 \
  .maestro/flows/onboarding/06-auth-email.yaml
```

Expected: Completes onboarding and lands on main app.

> **Troubleshooting:** If Supabase returns "User already registered", the test account exists. The onboarding auth step calls `signUpWithEmail` — update the Supabase test account to sign in instead, OR delete and recreate the test user from the Supabase dashboard before this test runs.

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/onboarding/06-auth-email.yaml
git commit -m "test(e2e): add onboarding email auth step flow"
```

---

## Task 8: Write Full Onboarding Happy Path Composite Flow

**Files:**
- Create: `.maestro/flows/onboarding/happy-path.yaml`

- [ ] **Step 1: Create `.maestro/flows/onboarding/happy-path.yaml`**

```yaml
# .maestro/flows/onboarding/happy-path.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Welcome
- assertVisible: "Welcome to"
- tapOn: "Get Started"

# Transition
- assertVisible: "Three quick questions"
- tapOn: "Continue"

# Relationship
- assertVisible: "How would you describe your relationship"
- tapOn: "Really good, I just want to keep growing"
- tapOn: "Continue"

# Focus
- assertVisible: "What would you like to focus on"
- tapOn: "Being more present & connected"
- tapOn: "Continue"

# Gender
- assertVisible: "About you"
- tapOn: "Man"
- tapOn: "Continue"

# Auth
- assertVisible: "You're all set."
- tapOn:
    id: "email"
- inputText: ${TEST_EMAIL}
- tapOn:
    id: "password"
- inputText: ${TEST_PASSWORD}
- tapOn: "Continue with email"

# Home
- assertVisible: "Today"
```

- [ ] **Step 2: Run full happy path**

```bash
maestro test \
  --env TEST_EMAIL=e2e-test@yourdomain.com \
  --env TEST_PASSWORD=e2eTestPassword123 \
  .maestro/flows/onboarding/happy-path.yaml
```

Expected: Full flow completes end-to-end in under 60 seconds.

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/onboarding/happy-path.yaml
git commit -m "test(e2e): add full onboarding happy path composite flow"
```

---

## Task 9: Write Login Screen Email Sign-In Flow

**Files:**
- Create: `.maestro/flows/auth/01-signin-email.yaml`

This tests the standalone login screen at `/(auth)/login`, reached when a user already has an account. The test account must already exist in Supabase (created by the onboarding test above or manually).

- [ ] **Step 1: Find how to reach the login screen directly**

The root index redirects based on auth state:
- No user → `/(onboard)` (onboarding wizard)
- User with no profile → `/(onboard)`  
- User with profile → `/(tabs)/(home)`

The login screen `/(auth)/login` is not reached via onboarding — it's a separate route. To navigate directly, we need to either deep-link or navigate from onboarding's auth step. 

Check whether `/(auth)/login` is accessible as a deep link or via a "Sign In" toggle in the onboarding auth step. From reading `steps/auth.tsx`, the onboarding auth step only has sign-up — there is no "already have an account?" toggle.

The standalone login screen (with the Sign In / Sign Up toggle) is at `/(auth)/login`. To reach it in tests, launch the app with a cleared state and navigate: the app will redirect to `/(onboard)`, then we navigate to `/(auth)/login` via deep link.

- [ ] **Step 2: Create `.maestro/flows/auth/01-signin-email.yaml`**

```yaml
# .maestro/flows/auth/01-signin-email.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# App starts in onboarding for unauthenticated user.
# Deep link directly to the login screen.
- openLink: "wingman-app://login"

# Verify login screen rendered
- assertVisible: "Welcome Back"

# Enter credentials
- tapOn:
    id: "email"
- inputText: ${TEST_EMAIL}
- tapOn:
    id: "password"
- inputText: ${TEST_PASSWORD}

# Sign in
- tapOn: "Sign In"

# Should land on home
- assertVisible: "Today"
```

> **Note:** Replace `wingman-app://login` with your actual deep link scheme. Check `app.json` for the `scheme` field. If deep linking isn't configured, an alternative is to tap through onboarding to the auth step and use a "Sign In" mode.

- [ ] **Step 3: Check deep link scheme in app.json**

```bash
grep -A 5 '"scheme"' app/app.json
```

Update the `openLink` URL in the flow to match the actual scheme.

- [ ] **Step 4: Run the flow**

```bash
maestro test \
  --env TEST_EMAIL=e2e-test@yourdomain.com \
  --env TEST_PASSWORD=e2eTestPassword123 \
  .maestro/flows/auth/01-signin-email.yaml
```

Expected: Signs in and lands on home.

- [ ] **Step 5: Commit**

```bash
git add .maestro/flows/auth/01-signin-email.yaml
git commit -m "test(e2e): add email sign-in flow"
```

---

## Task 10: Write Email Sign-Up Flow

**Files:**
- Create: `.maestro/flows/auth/02-signup-email.yaml`

Sign-up creates a new user each run, so we need a unique email. Maestro can inject a timestamp using JavaScript in `runScript`, but the simpler approach is passing a timestamp-based email from the shell.

- [ ] **Step 1: Create `.maestro/flows/auth/02-signup-email.yaml`**

```yaml
# .maestro/flows/auth/02-signup-email.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate to standalone login/signup screen
- openLink: "wingman-app://login"
- assertVisible: "Welcome Back"

# Switch to sign-up mode
- tapOn: "Sign Up"
- assertVisible: "Create Account"

# Enter a unique email (passed from shell each run)
- tapOn:
    id: "email"
- inputText: ${NEW_USER_EMAIL}
- tapOn:
    id: "password"
- inputText: ${NEW_USER_PASSWORD}

# Sign up
- tapOn: "Sign Up"

# Should land on home OR show email confirmation message
# Supabase may require email confirmation depending on project settings.
# With email confirmation disabled (dev settings): lands on home
- assertVisible: "Today"
```

- [ ] **Step 2: Run with a unique email**

```bash
maestro test \
  --env NEW_USER_EMAIL="e2e-new-$(date +%s)@yourdomain.com" \
  --env NEW_USER_PASSWORD=testPassword456 \
  .maestro/flows/auth/02-signup-email.yaml
```

Expected: Creates account and lands on home.

> **Cleanup:** New test users accumulate in Supabase. Periodically clean them up from the Supabase dashboard, or add a cleanup script using the service role key.

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/auth/02-signup-email.yaml
git commit -m "test(e2e): add email sign-up flow"
```

---

## Task 11: Write Auth Validation Error Flows

**Files:**
- Create: `.maestro/flows/auth/03-validation-errors.yaml`

- [ ] **Step 1: Create `.maestro/flows/auth/03-validation-errors.yaml`**

```yaml
# .maestro/flows/auth/03-validation-errors.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml
- openLink: "wingman-app://login"
- assertVisible: "Welcome Back"

# --- Test 1: Empty form submission ---
- tapOn: "Sign In"
- assertVisible: "Email is required"
- assertVisible: "Password is required"

# --- Test 2: Invalid email format ---
- tapOn:
    id: "email"
- clearText
- inputText: "not-an-email"
- tapOn: "Sign In"
- assertVisible: "Invalid email address"

# --- Test 3: Password too short ---
- tapOn:
    id: "email"
- clearText
- inputText: ${TEST_EMAIL}
- tapOn:
    id: "password"
- clearText
- inputText: "abc"
- tapOn: "Sign In"
- assertVisible: "Password must be at least 6 characters"

# --- Test 4: Wrong password (Supabase error) ---
- tapOn:
    id: "password"
- clearText
- inputText: "wrongpassword"
- tapOn: "Sign In"
# Supabase returns "Invalid login credentials"
- assertVisible: "Invalid login credentials"
```

- [ ] **Step 2: Run the flow**

```bash
maestro test \
  --env TEST_EMAIL=e2e-test@yourdomain.com \
  .maestro/flows/auth/03-validation-errors.yaml
```

Expected: All four validation checks pass.

> **Note:** Supabase error message text ("Invalid login credentials") may differ by Supabase version or project config. Check the actual error in the app if the assertion fails and update accordingly.

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/auth/03-validation-errors.yaml
git commit -m "test(e2e): add auth validation error flows"
```

---

## Task 12: Add E2E Bypass Mode for Social Auth

**Files:**
- Modify: `app/hooks/use-auth.tsx`

Google and Apple sign-in use native SDKs that require user interaction with system dialogs or real OAuth. To make them testable in CI (GitHub Actions), add an `EXPO_PUBLIC_E2E=true` bypass that short-circuits the SDK and uses email/password auth with the test account instead.

This only affects builds where `EXPO_PUBLIC_E2E=true` is set. Never set this in production.

- [ ] **Step 1: Add `EXPO_PUBLIC_E2E` to the env schema in `app/lib/env.ts`**

Open `app/lib/env.ts`. Find where environment variables are defined. Add:

```typescript
EXPO_PUBLIC_E2E: z.string().optional(),
EXPO_PUBLIC_E2E_EMAIL: z.string().optional(),
EXPO_PUBLIC_E2E_PASSWORD: z.string().optional(),
```

- [ ] **Step 2: Add E2E bypass to `signInWithGoogle` in `app/hooks/use-auth.tsx`**

Find the `signInWithGoogle` function. Add the bypass at the top of the function body:

```typescript
const signInWithGoogle = async () => {
  if (process.env.EXPO_PUBLIC_E2E === 'true') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.EXPO_PUBLIC_E2E_EMAIL!,
      password: process.env.EXPO_PUBLIC_E2E_PASSWORD!,
    });
    if (error) throw error;
    return data.user;
  }
  // ... existing Google SDK implementation
```

- [ ] **Step 3: Add E2E bypass to `signInWithApple` in `app/hooks/use-auth.tsx`**

Find the `signInWithApple` function. Add the same bypass at the top:

```typescript
const signInWithApple = async () => {
  if (process.env.EXPO_PUBLIC_E2E === 'true') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.EXPO_PUBLIC_E2E_EMAIL!,
      password: process.env.EXPO_PUBLIC_E2E_PASSWORD!,
    });
    if (error) throw error;
    return data.user;
  }
  // ... existing Apple SDK implementation
```

- [ ] **Step 4: Add the E2E env vars to `.env.maestro` (local) and verify TypeScript**

```bash
# Add to .maestro/.env.maestro:
EXPO_PUBLIC_E2E=true
EXPO_PUBLIC_E2E_EMAIL=e2e-test@yourdomain.com
EXPO_PUBLIC_E2E_PASSWORD=e2eTestPassword123
```

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Rebuild the app with E2E env vars**

```bash
cd app && EXPO_PUBLIC_E2E=true EXPO_PUBLIC_E2E_EMAIL=e2e-test@yourdomain.com \
  EXPO_PUBLIC_E2E_PASSWORD=e2eTestPassword123 npx expo run:ios
```

- [ ] **Step 6: Commit**

```bash
git add app/hooks/use-auth.tsx app/lib/env.ts
git commit -m "chore: add E2E bypass mode for social auth in test builds"
```

---

## Task 13: Write Google Sign-In Flow

**Files:**
- Create: `.maestro/flows/auth/04-google-signin.yaml`

With the E2E bypass in place, the "Sign up with Google" button calls email auth under the hood in E2E builds — no system dialog needed.

- [ ] **Step 1: Create `.maestro/flows/auth/04-google-signin.yaml`**

```yaml
# .maestro/flows/auth/04-google-signin.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate to auth screen (standalone login)
- openLink: "wingman-app://login"
- assertVisible: "Welcome Back"

# Tap Google sign-in button
- tapOn: "Sign up with Google"

# With EXPO_PUBLIC_E2E=true, this calls email auth directly.
# Should land on home.
- assertVisible: "Today"
```

- [ ] **Step 2: Build app with E2E env vars and run the flow**

First ensure the simulator has an E2E build running (from Task 12, Step 5), then:

```bash
maestro test \
  .maestro/flows/auth/04-google-signin.yaml
```

Expected: Taps Google button → lands on home (via E2E bypass).

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/auth/04-google-signin.yaml
git commit -m "test(e2e): add Google sign-in flow"
```

---

## Task 14: Write Apple Sign-In Flow

**Files:**
- Create: `.maestro/flows/auth/05-apple-signin.yaml`

Apple Sign-In is iOS only. With the E2E bypass, the native Apple auth button triggers email auth instead.

- [ ] **Step 1: Create `.maestro/flows/auth/05-apple-signin.yaml`**

```yaml
# .maestro/flows/auth/05-apple-signin.yaml
appId: com.pearprogramming.wingmanapp
---
- runFlow: ../../utils/launch.yaml

# Navigate to auth screen
- openLink: "wingman-app://login"
- assertVisible: "Welcome Back"

# Apple button is iOS-only and rendered by expo-apple-authentication.
# Maestro targets it by its visible label text.
- tapOn: "Sign in with Apple"

# With EXPO_PUBLIC_E2E=true, this calls email auth directly.
# Should land on home.
- assertVisible: "Today"
```

> **Note:** The Apple button renders with text "Sign in with Apple" or "Continue with Apple" depending on `AppleAuthenticationButtonType`. The onboarding `AuthStep` and login screen both use `SIGN_UP` type, which renders "Sign up with Apple". Update the `tapOn` text to match what actually renders on screen.

- [ ] **Step 2: Run the flow**

```bash
maestro test \
  .maestro/flows/auth/05-apple-signin.yaml
```

Expected: Taps Apple button → lands on home (via E2E bypass).

- [ ] **Step 3: Commit**

```bash
git add .maestro/flows/auth/05-apple-signin.yaml
git commit -m "test(e2e): add Apple sign-in flow"
```

---

## Task 15: Write GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

This workflow builds the app with E2E env vars on a macOS runner, boots an iOS simulator, and runs all Maestro flows.

- [ ] **Step 1: Add secrets to GitHub repository**

Go to repo Settings → Secrets and Variables → Actions. Add:
- `E2E_TEST_EMAIL` → `e2e-test@yourdomain.com`
- `E2E_TEST_PASSWORD` → your test account password
- `SUPABASE_URL` → dev Supabase URL
- `SUPABASE_ANON_KEY` → dev Supabase anon key
- `GOOGLE_IOS_CLIENT_ID` → Google iOS client ID (not used in E2E builds but needed for build to succeed)

- [ ] **Step 2: Create `.github/workflows/e2e.yml`**

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  e2e-ios:
    name: iOS E2E (Maestro)
    runs-on: macos-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: app/package-lock.json

      - name: Install dependencies
        working-directory: app
        run: npm ci

      - name: Install Maestro CLI
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Boot iOS Simulator
        run: |
          DEVICE_ID=$(xcrun simctl create "iPhone16-E2E" "iPhone 16" "iOS-18-4")
          xcrun simctl boot $DEVICE_ID
          echo "SIMULATOR_UDID=$DEVICE_ID" >> $GITHUB_ENV

      - name: Build app for simulator (E2E mode)
        working-directory: app
        env:
          EXPO_PUBLIC_E2E: "true"
          EXPO_PUBLIC_E2E_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          EXPO_PUBLIC_E2E_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: ${{ secrets.GOOGLE_IOS_CLIENT_ID }}
        run: |
          npx expo prebuild --platform ios --clean
          xcodebuild \
            -workspace ios/wingman-app.xcworkspace \
            -scheme wingman-app \
            -configuration Debug \
            -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
            -derivedDataPath build \
            CODE_SIGNING_ALLOWED=NO \
            build 2>&1 | tail -50

      - name: Install app on simulator
        run: |
          APP_PATH=$(find build -name "*.app" -not -path "*/Build/Products/Debug-iphonesimulator/*.app.dSYM" | head -1)
          xcrun simctl install $SIMULATOR_UDID "$APP_PATH"

      - name: Run Maestro flows
        env:
          TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
        run: |
          maestro test \
            --env TEST_EMAIL=$TEST_EMAIL \
            --env TEST_PASSWORD=$TEST_PASSWORD \
            .maestro/flows/

      - name: Upload Maestro results on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-results
          path: ~/.maestro/tests/
```

> **Note on build time:** Building for simulator takes 10-20 minutes. Use Maestro Cloud or EAS Build + Maestro Cloud Upload Action for faster CI if budget allows — they cache builds and run tests in parallel.

- [ ] **Step 3: Check that `app/ios/wingman-app.xcworkspace` exists**

```bash
ls app/ios/*.xcworkspace
```

If it doesn't exist, run `npx expo prebuild` locally first and commit the `ios/` directory, or adjust the `xcodebuild` command to use `.xcodeproj` instead.

- [ ] **Step 4: Push branch and verify workflow triggers**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add Maestro E2E iOS workflow for GitHub Actions"
git push
```

Check the Actions tab in GitHub to verify the workflow starts.

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|---|---|
| Maestro installation & setup | Task 1 |
| Onboarding: Welcome step | Task 4 |
| Onboarding: Transition step | Task 5 |
| Onboarding: Relationship step | Task 5 |
| Onboarding: Focus step | Task 6 |
| Onboarding: Gender step | Task 6 |
| Onboarding: Email auth step | Task 7 |
| Full onboarding happy path | Task 8 |
| Auth: Email sign-in | Task 9 |
| Auth: Email sign-up | Task 10 |
| Auth: Validation errors | Task 11 |
| Social: Google Sign-In | Tasks 12 + 13 |
| Social: Apple Sign-In | Tasks 12 + 14 |
| CI: GitHub Actions | Task 15 |

### Known limitations

1. **Deep link scheme**: Tasks 9-14 assume a deep link scheme to reach `/(auth)/login`. Verify the scheme from `app.json` and update `openLink` URLs. If no deep link scheme is configured, add navigation from the onboarding auth step or configure it in `app.json`.

2. **Apple button text**: The exact label for the Apple Sign-In button depends on `AppleAuthenticationButtonType`. Verify on simulator and update `tapOn` in Task 14 accordingly.

3. **Home screen assertion**: `assertVisible: "Today"` assumes the home screen shows a "Today" label. Verify the actual first element visible after onboarding completes.

4. **Supabase email confirmation**: If dev Supabase has email confirmation enabled, the sign-up flow will show a "check your email" screen instead of the home screen. Disable email confirmation for the dev project, or update the signup flow assertion.

5. **Test user re-registration**: `06-auth-email.yaml` calls `signUpWithEmail` which will fail if the test account already exists. Consider using a dedicated test user that exists ahead of time and signing in instead, or use the `happy-path.yaml` only for initial setup and `01-signin-email.yaml` for ongoing runs.

6. **Transition step animation**: Maestro waits for elements but the `moti` animations in transition may add small delays. If flows flake on the transition step, add `- waitForAnimationToEnd` before asserting.
