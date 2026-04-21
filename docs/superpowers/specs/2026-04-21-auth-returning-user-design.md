# Auth: Returning User Bridge

**Date:** 2026-04-21
**Status:** Approved

## Problem

Two gaps exist in the new/returning user auth flow:

1. A returning user who loses their session (reinstall, token expiry) is routed through onboarding as if new. When they reach `AuthStep` and submit their existing email, Supabase returns `user_already_exists` and they see an error with no recovery path.
2. There is no escape hatch for a returning user to reach the login screen before going through onboarding. `/(auth)/login` exists but is unreachable from the normal entry flow.

## Changes

### A — Silent sign-in fallback in `AuthStep` (`app/app/(onboard)/steps/auth.tsx`)

In `onSubmit`, after `signUpWithEmail` throws:
- If `e.errorCode === 'user_already_exists'`, call `signInWithEmail` with the same email/password.
- If sign-in succeeds, call `onComplete(user.id)` as normal — the user sees no error.
- If sign-in also throws (e.g. wrong password), surface that error to the user normally.

No UI changes. No new state.

### B — "Already have an account?" link in `WelcomeStep` (`app/app/(onboard)/steps/welcome.tsx`)

- Add `useRouter` from `expo-router`.
- Below the `<Button>Get Started</Button>`, add a row with:
  - Text: "Already have an account?"
  - `TouchableOpacity` labelled "Sign In" in `text-indigo-400 font-gabarito font-bold text-base`
  - On press: `router.push("/(auth)/login")`
- Match the row layout from `app/app/(auth)/login.tsx` lines 301–314.
- Update bottom container padding from `pb-2` to `pb-8` to accommodate the new row.

No props added to `WelcomeStep`. No changes to `OnboardWizard`.

## Files Changed

| File | Change |
|------|--------|
| `app/app/(onboard)/steps/auth.tsx` | Silent `signInWithEmail` fallback on `user_already_exists` |
| `app/app/(onboard)/steps/welcome.tsx` | "Already have an account? Sign In" link |

## Out of Scope

- Guard on `/(tabs)/_layout.tsx` for unauthenticated direct navigation (separate concern).
- Social auth changes (Google/Apple already upsert correctly for new and returning users).
