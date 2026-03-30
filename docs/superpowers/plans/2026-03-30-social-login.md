# Social Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native Google and Apple Sign In to the login screen and onboarding auth step, alongside existing email/password auth.

**Architecture:** Two new methods (`signInWithGoogle`, `signInWithApple`) are added to the `useAuth` hook. The onboarding `AuthStep` is refactored to own all auth logic internally and call a unified `onComplete(userId)` callback. The login screen gains social buttons using the same hook methods. The onboarding wizard's `handleSignup` is replaced with `handleComplete(userId)` which only handles profile creation.

**Tech Stack:** `expo-apple-authentication` (native Apple Sign In sheet), `@react-native-google-signin/google-signin` (native Google picker), Supabase `signInWithIdToken` for both providers.

---

## Prerequisites (manual, before starting tasks)

1. **Supabase dashboard:** Enable Google and Apple providers under Authentication → Providers. Configure Google with OAuth client credentials from Google Cloud Console. Configure Apple with the Service ID, Team ID, and private key from Apple Developer.
2. **Google Cloud Console:** Create an OAuth 2.0 iOS client ID for `com.pearprogramming.wingmanapp`. Note both the iOS client ID and the Web client ID (needed for Supabase token exchange).
3. **Apple Developer:** Enable Sign In with Apple for the `com.pearprogramming.wingmanapp` App ID.

---

## File Map

| File | Change |
|------|--------|
| `app/package.json` | Add two packages via `npx expo install` |
| `app/app.json` | Add `expo-apple-authentication` + `@react-native-google-signin/google-signin` plugins |
| `app/.env.example` | Document new Google env vars |
| `app/lib/env.ts` | Add `google.iosClientId` and `google.webClientId` to schema |
| `app/hooks/use-auth.tsx` | Add `signInWithGoogle`, `signInWithApple`; configure GoogleSignin |
| `app/app/(onboard)/steps/auth.tsx` | Refactor prop `onSignup→onComplete`, add social buttons |
| `app/app/(onboard)/index.tsx` | Replace `handleSignup` with `handleComplete(userId)` |
| `app/app/(auth)/login.tsx` | Add social buttons and divider above email form |
| `supabase/migrations/20231128000000_init.sql` | **No changes.** Supabase stores OAuth identities in its internal `auth.users`/`auth.identities` tables. The `user_profiles` table uses `auth.uid()` as its FK, which is provider-agnostic. Profile creation happens post-auth in the onboarding wizard as before. |

---

## Task 1: Install packages

**Files:**
- Modify: `app/package.json` (via expo install)

- [ ] **Step 1: Install the two new packages**

```bash
cd /path/to/app && npx expo install expo-apple-authentication @react-native-google-signin/google-signin
```

Expected: both packages appear in `package.json` dependencies, `node_modules` updated.

- [ ] **Step 2: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "feat: install expo-apple-authentication and google-signin packages"
```

---

## Task 2: Configure app.json

**Files:**
- Modify: `app/app.json`

The `expo-apple-authentication` plugin injects the Sign In with Apple entitlement automatically. The `@react-native-google-signin/google-signin` plugin registers the iOS URL scheme needed for OAuth redirect. Replace `YOUR_REVERSED_IOS_CLIENT_ID` with the reversed form of your iOS OAuth client ID (e.g. if the client ID is `12345.apps.googleusercontent.com`, the reversed form is `com.googleusercontent.apps.12345`).

- [ ] **Step 1: Add plugins to `app/app.json`**

In the `"plugins"` array, add the two new entries:

```json
"plugins": [
  [
    "onesignal-expo-plugin",
    {
      "mode": "development"
    }
  ],
  "expo-router",
  "expo-font",
  "expo-apple-authentication",
  [
    "@react-native-google-signin/google-signin",
    {
      "iosUrlScheme": "com.googleusercontent.apps.YOUR_REVERSED_IOS_CLIENT_ID"
    }
  ]
]
```

- [ ] **Step 2: Commit**

```bash
git add app/app.json
git commit -m "feat: configure Apple and Google Sign In plugins in app.json"
```

---

## Task 3: Add Google env vars

**Files:**
- Modify: `app/.env.example`
- Modify: `app/lib/env.ts`
- Manual: add real values to `app/.env`

- [ ] **Step 1: Update `.env.example`**

Append to `app/.env.example`:

```
# Google Sign In
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

- [ ] **Step 2: Update `app/lib/env.ts`**

Add a `google` block to the Zod schema and the parse call. Final file:

```ts
import { z } from "zod";

export const env = z
  .object({
    environment: z.enum(["development", "staging", "production"]),
    flags: z.object({
      useAnalytics: z.boolean(),
      useReminders: z.boolean(),
      useActionNotifications: z.boolean(),
    }),
    onesignal: z.object({
      appId: z.string(),
    }),
    amplitude: z.object({
      apiKey: z.string(),
    }),
    supabase: z.object({
      url: z.string(),
      anonKey: z.string(),
    }),
    google: z.object({
      iosClientId: z.string(),
      webClientId: z.string(),
    }),
  })
  .parse({
    environment: process.env.EXPO_PUBLIC_ENV ?? "development",
    flags: {
      useAnalytics: process.env.EXPO_PUBLIC_ANALYTICS === "true",
      useReminders: process.env.EXPO_PUBLIC_REMINDERS === "true",
      useActionNotifications: process.env.EXPO_PUBLIC_ACTION_NOTIFICATIONS === "true",
    },
    onesignal: {
      appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    },
    amplitude: {
      apiKey: process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY,
    },
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    google: {
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    },
  });
```

- [ ] **Step 3: Add real values to `app/.env`** (manual — values from Google Cloud Console)

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your iOS OAuth client ID>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your Web OAuth client ID>
```

- [ ] **Step 4: Commit**

```bash
git add app/.env.example app/lib/env.ts
git commit -m "feat: add Google client ID env vars to schema"
```

---

## Task 4: Update `use-auth` hook with social methods

**Files:**
- Modify: `app/hooks/use-auth.tsx`

`signInWithGoogle` and `signInWithApple` both return `User | null` — `null` means the user cancelled, which callers handle by doing nothing. All other errors are thrown.

`GoogleSignin.configure()` is called once in the `AuthProvider` on mount.

- [ ] **Step 1: Replace `app/hooks/use-auth.tsx` with the updated version**

```tsx
import { initialiseAnalytics } from "@/lib/analytics";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { Session, User } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  lastEvent: AuthEvent | null;
  signUpWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User | null>;
  signInWithApple: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
  lastEvent: null,
  signUpWithEmail: async () => null as unknown as User,
  signInWithEmail: async () => null as unknown as User,
  signInWithGoogle: async () => null,
  signInWithApple: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastEvent, setLastEvent] = useState<AuthEvent | null>(null);

  async function identifyAuthUser(userId: string) {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_tier")
      .eq("user_id", userId)
      .single();

    initialiseAnalytics(userId, data?.user_tier ?? "free");
  }

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: env.google.webClientId,
      iosClientId: env.google.iosClientId,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialise() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);
        if (currentSession?.user.id) {
          identifyAuthUser(currentSession.user.id);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error getting session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setLastEvent(event as AuthEvent);

      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (newSession) {
        setSession(newSession);
        identifyAuthUser(newSession.user.id);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("No ID token returned from Google");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase");
      return data.user;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      throw error;
    }
  };

  const signInWithApple = async (): Promise<User | null> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("No identity token from Apple");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase");
      return data.user;
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") return null;
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signOut,
        lastEvent,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/hooks/use-auth.tsx
git commit -m "feat: add signInWithGoogle and signInWithApple to auth hook"
```

---

## Task 5: Refactor onboarding `AuthStep`

**Files:**
- Modify: `app/app/(onboard)/steps/auth.tsx`

The step now owns all auth. The prop changes from `onSignup(email, password)` to `onComplete(userId)`. Social buttons appear above the email form. The Apple button is iOS-only. Analytics tracking moves here from the onboarding wizard.

- [ ] **Step 1: Replace `app/app/(onboard)/steps/auth.tsx`**

```tsx
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type FormValues = {
  email: string;
  password: string;
};

type Props = {
  onComplete: (userId: string) => Promise<void>;
};

export function AuthStep({ onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });

  const handleSocialAuth = async (provider: "google" | "apple") => {
    setIsLoading(true);
    setError(null);
    trackEvent("auth_signup_initiated", { provider });
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithApple();
      if (!user) return; // user cancelled
      trackEvent("auth_signup_succeeded", { provider });
      await onComplete(user.id);
    } catch (err) {
      trackEvent("auth_signup_failed", {
        provider,
        error: err instanceof Error ? err.message : "unknown",
      });
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async ({ email, password }: FormValues) => {
    setIsLoading(true);
    setError(null);
    trackEvent("auth_signup_initiated", { provider: "email" });
    try {
      const user = await signUpWithEmail(email, password);
      if (!user) {
        throw new Error(
          "Please check your email to confirm your account, then sign in.",
        );
      }
      trackEvent("auth_signup_succeeded", { provider: "email" });
      await onComplete(user.id);
    } catch (err) {
      trackEvent("auth_signup_failed", {
        provider: "email",
        error: err instanceof Error ? err.message : "unknown",
      });
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`flex-grow px-6 justify-center pb-4`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-10`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3 leading-tight`}
          >
            You're all set.{"\n"}Create your account to save your progress.
          </Text>
        </View>

        <View style={tw`gap-4 mb-6`}>
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={100}
              style={{ height: 56 }}
              onPress={() => handleSocialAuth("apple")}
            />
          )}
          <TouchableOpacity
            style={tw`w-full h-14 flex-row items-center justify-center border-2 border-ink/15 rounded-full gap-3`}
            onPress={() => handleSocialAuth("google")}
            disabled={isLoading}
          >
            <FontAwesome name="google" size={20} color="#2E3130" />
            <Text style={tw`text-ink font-gabarito font-bold text-base`}>
              Continue with Google
            </Text>
          </TouchableOpacity>
        </View>

        <View style={tw`flex-row items-center gap-3 mb-6`}>
          <View style={tw`flex-1 h-px bg-ink/10`} />
          <Text style={tw`text-ink/40 font-gabarito text-sm`}>or</Text>
          <View style={tw`flex-1 h-px bg-ink/10`} />
        </View>

        <View style={tw`gap-5 mb-6`}>
          <Controller
            control={control}
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <View>
                <Input
                  name="email"
                  placeholder="Email address"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                {errors.email && (
                  <Text
                    style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}
                  >
                    {errors.email.message}
                  </Text>
                )}
              </View>
            )}
            name="email"
          />

          <Controller
            control={control}
            rules={{
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <View>
                <Input
                  name="password"
                  placeholder="Password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <Text
                    style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}
                  >
                    {errors.password.message}
                  </Text>
                )}
              </View>
            )}
            name="password"
          />
        </View>

        {error && (
          <View
            style={tw`p-5 bg-red-600/10 rounded-2xl border-2 border-red-600/30 mb-6`}
          >
            <Text
              style={tw`text-red-600 font-gabarito text-base leading-relaxed`}
            >
              {error}
            </Text>
          </View>
        )}

        <Button disabled={isLoading} onPress={handleSubmit(onSubmit)}>
          {isLoading ? "Creating account..." : "Continue with email →"}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/app/(onboard)/steps/auth.tsx
git commit -m "feat: refactor AuthStep to own all auth methods with social login"
```

---

## Task 6: Update onboarding wizard

**Files:**
- Modify: `app/app/(onboard)/index.tsx`

`handleSignup` is replaced by `handleComplete(userId)` which only handles profile creation. `signUpWithEmail` is removed from the `useAuth()` destructure. The `AuthStep` prop updates from `onSignup` to `onComplete`.

- [ ] **Step 1: Update the `useAuth()` destructure** (remove `signUpWithEmail`)

Change line 31:
```tsx
const { user, isLoading: authLoading, signUpWithEmail } = useAuth();
```
to:
```tsx
const { user, isLoading: authLoading } = useAuth();
```

- [ ] **Step 2: Replace `handleSignup` with `handleComplete`**

Remove the entire `handleSignup` function:
```tsx
const handleSignup = async (email: string, password: string) => {
  trackEvent("auth_signup_initiated");
  const signedUpUser = await signUpWithEmail(email, password);
  if (!signedUpUser) {
    throw new Error(
      "Please check your email to confirm your account, then sign in.",
    );
  }
  trackEvent("auth_signup_succeeded");
  await submitProfile(signedUpUser.id);
};
```

Replace with:
```tsx
const handleComplete = async (userId: string) => {
  await submitProfile(userId);
};
```

- [ ] **Step 3: Update the `AuthStep` prop in the JSX**

Change:
```tsx
<AuthStep onSignup={handleSignup} />
```
to:
```tsx
<AuthStep onComplete={handleComplete} />
```

- [ ] **Step 4: Commit**

```bash
git add app/app/(onboard)/index.tsx
git commit -m "feat: update onboarding wizard to use AuthStep onComplete callback"
```

---

## Task 7: Update login screen

**Files:**
- Modify: `app/app/(auth)/login.tsx`

Add social buttons above the email form. Apple is iOS-only. A divider separates social from email. The `mode` toggle still works — social login handles both sign-in and sign-up (Supabase upserts via `signInWithIdToken`).

- [ ] **Step 1: Add imports to `app/app/(auth)/login.tsx`**

Add after the existing imports:
```tsx
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
```

- [ ] **Step 2: Destructure social methods from `useAuth()`**

Change:
```tsx
const {
  user,
  isLoading: authLoading,
  signUpWithEmail,
  signInWithEmail,
} = useAuth();
```
to:
```tsx
const {
  user,
  isLoading: authLoading,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
} = useAuth();
```

- [ ] **Step 3: Add `handleSocialSignIn` function** (place it after `toggleMode`)

```tsx
const handleSocialSignIn = async (provider: "google" | "apple") => {
  setIsLoading(true);
  setError(null);
  trackEvent("auth_login_initiated");
  try {
    const user =
      provider === "google"
        ? await signInWithGoogle()
        : await signInWithApple();
    if (!user) return; // user cancelled
    trackEvent("auth_login_succeeded");
  } catch (err) {
    trackEvent("auth_login_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    setError(
      err instanceof Error ? err.message : "An unknown error occurred",
    );
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 4: Add social buttons and divider to the JSX**

In the `Animated.View`, between the title/subtitle block (`<View style={tw`mb-12`}>`) and the email/password `<View style={tw`w-full gap-5 mb-6`}>`, insert:

```tsx
<View style={tw`w-full gap-4 mb-6`}>
  {Platform.OS === "ios" && (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
      }
      buttonStyle={
        AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={100}
      style={{ height: 56 }}
      onPress={() => handleSocialSignIn("apple")}
    />
  )}
  <TouchableOpacity
    style={tw`w-full h-14 flex-row items-center justify-center border-2 border-ink/15 rounded-full gap-3`}
    onPress={() => handleSocialSignIn("google")}
    disabled={isLoading}
  >
    <FontAwesome name="google" size={20} color="#2E3130" />
    <Text style={tw`text-ink font-gabarito font-bold text-base`}>
      Continue with Google
    </Text>
  </TouchableOpacity>
</View>

<View style={tw`flex-row items-center gap-3 w-full mb-6`}>
  <View style={tw`flex-1 h-px bg-ink/10`} />
  <Text style={tw`text-ink/40 font-gabarito text-sm`}>or</Text>
  <View style={tw`flex-1 h-px bg-ink/10`} />
</View>
```

- [ ] **Step 5: Commit**

```bash
git add app/app/(auth)/login.tsx
git commit -m "feat: add social login buttons to login screen"
```

---

## Task 8: Rebuild dev client and verify

Since native modules were added, a new dev client build is required before testing.

- [ ] **Step 1: Rebuild the dev client**

```bash
cd app && npx expo run:ios
```

Or via EAS:
```bash
eas build --platform ios --profile development
```

- [ ] **Step 2: Verify login screen**
  - Apple Sign In button appears on iOS above the email form
  - Google Sign In button appears below Apple
  - `— or —` divider separates social from email form
  - Tapping Apple shows the native Apple sheet; cancelling shows no error
  - Tapping Google shows the native Google picker; cancelling shows no error
  - Successful social sign in redirects to `/`

- [ ] **Step 3: Verify onboarding auth step**
  - Reaching step 5 shows social buttons above the email form
  - Apple and Google buttons work; after success, the profile is created and the user is routed to `/(tabs)/(home)`
  - Email path still works as before

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address social login issues found during verification"
```
