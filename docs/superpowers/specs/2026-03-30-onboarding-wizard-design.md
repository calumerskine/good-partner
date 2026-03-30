# Onboarding Wizard Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Expand the onboarding flow from a 2-screen sequence (Welcome → Focus Areas) into a 6-step single-screen wizard. Auth is moved to the end of onboarding — users complete all 3 questions unauthenticated, then create their account on the final step. Profile is written to the DB immediately after signup.

## Screen Flow

```
Step 0 — Welcome
Step 1 — Transition ("Three quick questions…")
Step 2 — Step 1/3: Relationship Status (single-select)
Step 3 — Step 2/3: Choose Your Focus (multi-select)
Step 4 — Step 3/3: About / Gender (single-select)
Step 5 — "You're all set" — email/password signup
```

Progress indicator ("Step X of 3") shown only on steps 2–4.
Back button shown on steps 2–4. Steps 0, 1, and 5 have no back navigation.

## Architecture

**Single wizard screen** (`app/app/(onboard)/index.tsx`). All steps are sub-components rendered conditionally based on a `currentStep` integer. All onboarding answers accumulate in a single local state object until signup succeeds.

### State shape

```ts
type OnboardingData = {
  relationshipStatus: string | null;
  focusAreas: string[];    // category keys e.g. ["ATTENTION", "REPAIR"]
  gender: string | null;
};
```

### Step options

**Relationship status (step 2):**
- `"great"` — "Really good, I just want to keep growing"
- `"distance"` — "Mostly solid, but I sense some distance"
- `"rough"` — "We're going through a rough patch"
- `"crisis"` — "We've had a real crisis recently"

**Focus areas (step 3):** existing PAIN_POINTS keys — ATTENTION, AFFECTION, INITIATIVE, REPAIR

**Gender (step 4):**
- `"man"` — "Man"
- `"woman"` — "Woman"
- `"nonbinary"` — "Non-binary"
- `"prefer_not_to_say"` — "Prefer not to say"

## File Changes

| File | Change |
|------|--------|
| `app/app/(onboard)/index.tsx` | Rewritten as full wizard |
| `app/app/(onboard)/areas.tsx` | Deleted — content moved into wizard step 3 |
| `app/app/(onboard)/_layout.tsx` | Remove auth guard (unauthenticated users must pass through) |
| `app/lib/api.ts` | Update `createUserProfile` to accept `relationship_status` and `gender` |
| Database | Add `relationship_status TEXT` and `gender TEXT` (nullable) to `user_profiles` |

## Auth Flow

- The `(onboard)/_layout.tsx` auth guard is removed.
- If a user arrives at the wizard already authenticated (e.g. profile creation previously failed), skip to step 2 — bypassing Welcome, Transition, and the auth step.
- On step 5: user submits email + password → `signUpWithEmail` runs → on success, `createUserProfile` is called with `userId` + all `OnboardingData` (with `hasCompletedOnboarding: true`) → navigate to `/(tabs)/(home)`.
- Signup mode only on step 5 (no toggle to login).

## Animations

Horizontal slide between steps: advancing slides new step in from right / current out to left. Going back reverses direction. Implemented with `react-native-reanimated` (consistent with existing usage in the codebase).

## Abandonment Handling

- **Pre-signup abandonment (steps 0–4):** No account created. Local state lost. On return, user starts from step 0. Acceptable — flow is "3 quick questions".
- **Post-signup, pre-profile-creation failure:** User is authenticated but has no profile (`has_completed_onboarding` is false). Root layout routes them back to `/(onboard)`. The wizard detects `user` is authenticated and jumps to step 2, allowing them to complete the questions and create the profile without re-authenticating.

## Database Migration

Add to `user_profiles` table:
```sql
ALTER TABLE user_profiles ADD COLUMN relationship_status TEXT;
ALTER TABLE user_profiles ADD COLUMN gender TEXT;
```

Per project convention, update `init.sql` directly rather than creating a new migration file.
