# Auth: Returning User Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two gaps that block returning users — a silent sign-in fallback when email signup fails with `user_already_exists`, and a "Sign In" escape hatch on the Welcome screen.

**Architecture:** Two isolated changes in two files. `AuthStep` gains a catch branch in `onSubmit` that retries with `signInWithEmail` when Supabase returns `user_already_exists`. `WelcomeStep` gains a router-driven link row below the Get Started button that navigates to `/(auth)/login`.

**Tech Stack:** React Native, Expo Router, Supabase (`@supabase/supabase-js`), `react-hook-form`, `twrnc`

---

## File Map

| File | Change |
|------|--------|
| `app/app/(onboard)/steps/auth.tsx` | Add silent `signInWithEmail` fallback in `onSubmit` catch block |
| `app/app/(onboard)/steps/welcome.tsx` | Add `useRouter` + "Already have an account? Sign In" link row |

---

## Task 1: Silent sign-in fallback in `AuthStep`

**Files:**
- Modify: `app/app/(onboard)/steps/auth.tsx`

### Context

`AuthStep` (`app/app/(onboard)/steps/auth.tsx`) is the last step of onboarding for unauthenticated users. Its `onSubmit` calls `signUpWithEmail`, which throws a structured error with `errorCode: 'user_already_exists'` when the email is already registered. Currently this error is surfaced to the user with no recovery path.

`useAuth` is imported from `@/hooks/use-auth` and already exposes `signInWithEmail`.

### Steps

- [ ] **Step 1: Add `signInWithEmail` to the `useAuth` destructure**

In `app/app/(onboard)/steps/auth.tsx`, line 25, change:

```tsx
const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
```

to:

```tsx
const { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
```

- [ ] **Step 2: Add the fallback branch in `onSubmit`**

Replace the catch block in `onSubmit` (currently lines 76–88):

```tsx
    } catch (err) {
      const e = err as Error & { errorCode?: string; errorStage?: string; errorStatus?: number };
      trackEvent("auth_signup_failed", {
        provider: "email",
        error: e instanceof Error ? e.message : "unknown",
        error_code: e.errorCode,
        error_stage: e.errorStage,
        error_status: e.errorStatus,
      });
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
```

with:

```tsx
    } catch (err) {
      const e = err as Error & { errorCode?: string; errorStage?: string; errorStatus?: number };
      if (e.errorCode === "user_already_exists") {
        try {
          const existingUser = await signInWithEmail(email, password);
          trackEvent("auth_signup_succeeded", { provider: "email" });
          await onComplete(existingUser.id);
          return;
        } catch (signInErr) {
          const se = signInErr as Error & { errorCode?: string; errorStage?: string; errorStatus?: number };
          trackEvent("auth_signup_failed", {
            provider: "email",
            error: se instanceof Error ? se.message : "unknown",
            error_code: se.errorCode,
            error_stage: se.errorStage,
            error_status: se.errorStatus,
          });
          setError(se instanceof Error ? se.message : "An unknown error occurred");
          return;
        }
      }
      trackEvent("auth_signup_failed", {
        provider: "email",
        error: e instanceof Error ? e.message : "unknown",
        error_code: e.errorCode,
        error_stage: e.errorStage,
        error_status: e.errorStatus,
      });
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
```

- [ ] **Step 3: Verify the file compiles**

Run: `cd app && npx tsc --noEmit`

Expected: no errors related to `auth.tsx`

- [ ] **Step 4: Manual verification — existing user, correct password**

In the Expo dev client, complete onboarding with an email that already has a Supabase account and its correct password. Expected: proceeds to `/(tabs)/(home)` with no error shown.

- [ ] **Step 5: Manual verification — existing user, wrong password**

Use an email that already has a Supabase account but supply the wrong password. Expected: error message from Supabase ("Invalid login credentials" or similar) is shown in the red error box.

- [ ] **Step 6: Manual verification — new user**

Use a fresh email that has no Supabase account. Expected: account created, proceeds to `/(tabs)/(home)` as before.

- [ ] **Step 7: Commit**

```bash
git add app/app/(onboard)/steps/auth.tsx
git commit -m "fix: silent sign-in fallback for returning users in AuthStep"
```

---

## Task 2: "Already have an account?" link in `WelcomeStep`

**Files:**
- Modify: `app/app/(onboard)/steps/welcome.tsx`

### Context

`WelcomeStep` (`app/app/(onboard)/steps/welcome.tsx`) has a single `<Button>Get Started</Button>` in its bottom container (`View style={tw\`w-full gap-4 pt-6 pb-2\``)`). Returning users have no way to reach `/(auth)/login` from this screen.

The link row should match the pattern in `app/app/(auth)/login.tsx` lines 301–314:

```tsx
<View style={tw`flex-row items-center justify-center gap-2`}>
  <Text style={tw`text-ink/80 font-gabarito text-base`}>
    Already have an account?
  </Text>
  <TouchableOpacity onPress={...}>
    <Text style={tw`text-indigo-400 font-gabarito font-bold text-base`}>
      Sign In
    </Text>
  </TouchableOpacity>
</View>
```

### Steps

- [ ] **Step 1: Add imports**

In `app/app/(onboard)/steps/welcome.tsx`, change line 4:

```tsx
import { Text, View } from "react-native";
```

to:

```tsx
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
```

- [ ] **Step 2: Add `useRouter` inside the component**

After line 11 (`export function WelcomeStep({ onNext }: Props) {`), add:

```tsx
  const router = useRouter();
```

- [ ] **Step 3: Update the bottom container and add the link row**

Replace the bottom `<View>` (currently lines 36–38):

```tsx
      <View style={tw`w-full gap-4 pt-6 pb-2`}>
        <Button onPress={onNext}>Get Started</Button>
      </View>
```

with:

```tsx
      <View style={tw`w-full gap-4 pt-6 pb-8`}>
        <Button onPress={onNext}>Get Started</Button>
        <View style={tw`flex-row items-center justify-center gap-2`}>
          <Text style={tw`text-ink/80 font-gabarito text-base`}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={tw`text-indigo-400 font-gabarito font-bold text-base`}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
```

- [ ] **Step 4: Verify the file compiles**

Run: `cd app && npx tsc --noEmit`

Expected: no errors related to `welcome.tsx`

- [ ] **Step 5: Manual verification — link is visible**

Open the Expo dev client and navigate to the Welcome screen (sign out first if needed). Confirm "Already have an account? Sign In" appears below the Get Started button.

- [ ] **Step 6: Manual verification — link navigates to login**

Tap "Sign In". Expected: `/(auth)/login` opens (the existing login screen with email/password form and Google/Apple buttons).

- [ ] **Step 7: Commit**

```bash
git add app/app/(onboard)/steps/welcome.tsx
git commit -m "feat: add sign in escape hatch to WelcomeStep for returning users"
```
