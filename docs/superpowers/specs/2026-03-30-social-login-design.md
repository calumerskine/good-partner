# Social Login Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add Google and Apple Sign In to both the login screen (`app/(auth)/login.tsx`) and the onboarding auth step (`app/(onboard)/steps/auth.tsx`). Email/password remains available as a third option. App will be submitted to the iOS App Store, requiring native Apple Sign In.

## Dependencies

New packages:
- `expo-apple-authentication` — native Apple Sign In sheet (required per Apple HIG and App Store rules)
- `@react-native-google-signin/google-signin` — native Google Sign In picker

## Configuration

### `app.json`
- Add `expo-apple-authentication` plugin (automatically injects the Sign In with Apple entitlement)
- Add Google Sign In iOS URL scheme for OAuth redirect

### `env.ts`
Add two new validated env vars:
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (required by Supabase for token exchange)

## Supabase

Google and Apple providers must be enabled in the Supabase dashboard with the appropriate client credentials (manual step, not scripted).

**`init.sql` — no changes required.** Supabase stores OAuth identities in its internal `auth.users` / `auth.identities` tables automatically. The `user_profiles` table uses `auth.uid()` as its FK, which is provider-agnostic. Profile creation continues to happen post-auth in the onboarding wizard.

## Auth Hook (`use-auth.tsx`)

Two new methods exposed via `useAuth()`:

### `signInWithGoogle()`
1. Call `GoogleSignin.signIn()` to show native picker
2. Extract `idToken` from result
3. Call `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`
4. Existing auth state listener handles session update

### `signInWithApple()`
1. Call `AppleAuthentication.signInAsync()` with `FULL_NAME` and `EMAIL` scopes
2. Extract `identityToken` from result
3. Call `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken })`
4. Existing auth state listener handles session update

Both methods throw on failure so callers can catch and show errors, consistent with existing email methods.

## UI Layout

Both `login.tsx` and `steps/auth.tsx` use the same layout order:

1. **Apple Sign In button** — `AppleAuthentication.AppleAuthenticationButton` (Apple-mandated appearance)
2. **Google Sign In button** — styled pill button matching app design, Google logo
3. **`— or —` divider**
4. **Existing email/password form** (unchanged)

## File Changes

### `app/(auth)/login.tsx`
- Add `signInWithGoogle` and `signInWithApple` from `useAuth()`
- Add social buttons above the email form with the divider
- Error handling follows existing pattern (catch → `setError`)

### `app/(onboard)/steps/auth.tsx`
- Prop changes: `onSignup(email, password)` → `onComplete()`
- Step now owns all auth internally via `useAuth()`:
  - Email path: calls `signUpWithEmail`, then `onComplete()`
  - Google path: calls `signInWithGoogle`, then `onComplete()`
  - Apple path: calls `signInWithApple`, then `onComplete()`
- Add social buttons above email form with divider

### `app/(onboard)/index.tsx`
- Update `AuthStep` prop from `onSignup` to `onComplete`
- `onComplete` handler contains only profile creation logic (auth removed — now lives in the step)

## Error Handling

- Google: `GoogleSignin.statusCodes.SIGN_IN_CANCELLED` — silent (user cancelled, no error shown)
- Apple: `ERR_REQUEST_CANCELED` — silent
- All other errors: caught and displayed via existing `error` state pattern
