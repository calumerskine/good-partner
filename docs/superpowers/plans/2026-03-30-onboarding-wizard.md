# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the onboarding flow into a 6-step single-screen wizard that collects relationship status, focus areas, and gender before prompting the user to create an account.

**Architecture:** A single wizard component in `index.tsx` manages step state and slide animations. Step sub-components live in `app/app/(onboard)/steps/`. All onboarding answers accumulate in local state and are persisted to the DB in one shot after signup. Auth is deferred to the final step.

**Tech Stack:** Expo Router, React Native Animated, react-hook-form, TanStack Query, Supabase

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20231128000000_init.sql` | Modify | Add `relationship_status` and `gender` columns to `user_profiles` |
| `supabase/migrations/20260330000000_add_onboarding_fields.sql` | Create | Migration adding the two new columns to existing DBs |
| `app/lib/api.ts` | Modify | Add `relationshipStatus` and `gender` to `createUserProfile` |
| `app/app/index.tsx` | Modify | Route unauthenticated users to `/(onboard)` instead of `/(auth)/login` |
| `app/app/(onboard)/_layout.tsx` | Modify | Remove auth guard |
| `app/app/(onboard)/index.tsx` | Rewrite | Wizard shell: step state, slide animations, auth detection |
| `app/app/(onboard)/steps/welcome.tsx` | Create | Step 0 — Welcome screen |
| `app/app/(onboard)/steps/transition.tsx` | Create | Step 1 — "Three quick questions" |
| `app/app/(onboard)/steps/relationship.tsx` | Create | Step 2 — Relationship status (single-select) |
| `app/app/(onboard)/steps/focus.tsx` | Create | Step 3 — Choose Your Focus (multi-select) |
| `app/app/(onboard)/steps/gender.tsx` | Create | Step 4 — About / gender (single-select) |
| `app/app/(onboard)/steps/auth.tsx` | Create | Step 5 — Email/password signup |
| `app/app/(onboard)/areas.tsx` | Delete | Content moved into steps/focus.tsx |

---

## Task 1: DB schema

**Files:**
- Modify: `supabase/migrations/20231128000000_init.sql`
- Create: `supabase/migrations/20260330000000_add_onboarding_fields.sql`

- [ ] **Step 1: Add columns to init.sql**

Open `supabase/migrations/20231128000000_init.sql`. In the `user_profiles` table definition, after the `has_completed_onboarding` line add:

```sql
-- user_profiles table: tracks each user's profile data
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  relationship_status TEXT,
  gender TEXT,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  action_notifications_enabled BOOLEAN DEFAULT FALSE,
  current_streak_days INTEGER DEFAULT 0,
  last_completion_date DATE,
  total_days_active INTEGER DEFAULT 0,
  morning_reminder_enabled BOOLEAN DEFAULT TRUE,
  evening_reminder_enabled BOOLEAN DEFAULT TRUE,
  morning_reminder_time TIME DEFAULT '10:00',
  evening_reminder_time TIME DEFAULT '19:00'
);
```

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/20260330000000_add_onboarding_fields.sql`:

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS relationship_status TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add relationship_status and gender to user_profiles"
```

---

## Task 2: Update createUserProfile API

**Files:**
- Modify: `app/lib/api.ts`

- [ ] **Step 1: Update the async `createUserProfile` function signature and insert**

Find the `async function createUserProfile(` declaration (around line 1452). Replace its signature and insert call:

```ts
async function createUserProfile(
  userId: string,
  categoryIds: string[],
  hasCompletedOnboarding: boolean,
  relationshipStatus: string | null,
  gender: string | null,
): Promise<UserProfile> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      user_id: userId,
      has_completed_onboarding: hasCompletedOnboarding,
      relationship_status: relationshipStatus,
      gender: gender,
    })
    .select("id, user_id, created_at")
    .single();
```

- [ ] **Step 2: Update the `useCreateUserProfile` mutation's mutationFn parameter type**

Find `useCreateUserProfile` (around line 1439). Replace the `mutationFn` block:

```ts
export function useCreateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createProfile,
    mutationFn: ({
      userId,
      categoryIds,
      hasCompletedOnboarding,
      relationshipStatus,
      gender,
    }: {
      userId: string;
      categoryIds: string[];
      hasCompletedOnboarding: boolean;
      relationshipStatus: string | null;
      gender: string | null;
    }) =>
      createUserProfile(
        userId,
        categoryIds,
        hasCompletedOnboarding,
        relationshipStatus,
        gender,
      ),
    onSuccess: (data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(userId),
      });
    },
  });
}
```

- [ ] **Step 3: Verify the app still builds (no TypeScript errors)**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors related to `createUserProfile`.

- [ ] **Step 4: Commit**

```bash
git add app/lib/api.ts
git commit -m "feat: add relationship_status and gender to createUserProfile"
```

---

## Task 3: Update routing

**Files:**
- Modify: `app/app/index.tsx`
- Modify: `app/app/(onboard)/_layout.tsx`

- [ ] **Step 1: Route unauthenticated users to onboarding, not login**

Replace `app/app/index.tsx`:

```tsx
import { useAuth } from "@/hooks/use-auth";
import { useGetUserProfile } from "@/lib/api";
import tw from "@/lib/tw";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/**
 * Root index route that handles initial navigation based on authentication state.
 */
export default function Index() {
  const { user, isLoading } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useGetUserProfile(
    user?.id,
  );

  if (isLoading || (user && isProfileLoading)) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(onboard)" />;
  }

  if (!profile?.hasCompletedOnboarding) {
    return <Redirect href="/(onboard)" />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
```

Note: the loading guard now only waits for profile when the user exists (avoids indefinite loading for unauthenticated users).

- [ ] **Step 2: Remove auth guard from onboard layout**

Replace `app/app/(onboard)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function OnboardScreenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
```

Note: `areas` screen is removed from the Stack since it will be deleted in Task 7.

- [ ] **Step 3: Commit**

```bash
git add app/app/index.tsx app/app/(onboard)/_layout.tsx
git commit -m "feat: route unauthenticated users to onboarding wizard"
```

---

## Task 4: Build wizard shell

**Files:**
- Rewrite: `app/app/(onboard)/index.tsx`

- [ ] **Step 1: Write the wizard shell**

Replace `app/app/(onboard)/index.tsx` with:

```tsx
import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useCreateUserProfile, useGetCategories } from "@/lib/api";
import tw from "@/lib/tw";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { WelcomeStep } from "./steps/welcome";
import { TransitionStep } from "./steps/transition";
import { RelationshipStep } from "./steps/relationship";
import { FocusStep } from "./steps/focus";
import { GenderStep } from "./steps/gender";
import { AuthStep } from "./steps/auth";

export type OnboardingData = {
  relationshipStatus: string | null;
  focusAreas: string[];
  gender: string | null;
};

export default function OnboardWizard() {
  const { user, isLoading: authLoading, signUpWithEmail } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const createProfileMutation = useCreateUserProfile();
  const { data: categories = [] } = useGetCategories();

  const [displayStep, setDisplayStep] = useState<number | null>(null);
  const [data, setData] = useState<OnboardingData>({
    relationshipStatus: null,
    focusAreas: [],
    gender: null,
  });

  const translateX = useRef(new Animated.Value(0)).current;

  // Resolve initial step once auth state is known
  useEffect(() => {
    if (!authLoading) {
      trackEvent("screen_viewed", { screen_name: "Onboarding" });
      setDisplayStep(user ? 2 : 0);
    }
  }, [authLoading]);

  const animateToStep = (nextStep: number, direction: "forward" | "back") => {
    const outValue = direction === "forward" ? -width : width;
    const inValue = direction === "forward" ? width : -width;

    Animated.timing(translateX, {
      toValue: outValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDisplayStep(nextStep);
      translateX.setValue(inValue);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const goForward = (nextStep: number) => animateToStep(nextStep, "forward");
  const goBack = () => animateToStep((displayStep ?? 2) - 1, "back");

  const getCategoryIds = (keys: string[]): string[] => {
    const nameToId = categories.reduce(
      (acc, cat) => {
        acc[cat.name] = cat.id;
        return acc;
      },
      {} as Record<string, string>,
    );
    return keys.map((k) => nameToId[k]).filter(Boolean);
  };

  const submitProfile = async (userId: string) => {
    await createProfileMutation.mutateAsync({
      userId,
      categoryIds: getCategoryIds(data.focusAreas),
      hasCompletedOnboarding: true,
      relationshipStatus: data.relationshipStatus,
      gender: data.gender,
    });
    trackEvent("onboarding_completed");
    router.replace("/(tabs)/(home)");
  };

  // Already-authenticated users finish at step 4 — skip to profile creation
  const handleStep4Next = async () => {
    if (user) {
      await submitProfile(user.id);
    } else {
      goForward(5);
    }
  };

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

  if (authLoading || displayStep === null) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  const showBack = displayStep >= 2 && displayStep <= 4;
  const showProgress = displayStep >= 2 && displayStep <= 4;
  const progressStep = displayStep - 1; // step 2 → 1, step 3 → 2, step 4 → 3

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header row: back + progress */}
      <View style={tw`px-4 pt-2 pb-0 min-h-14 justify-center`}>
        {showBack && (
          <TouchableOpacity onPress={goBack} style={tw`absolute left-4 p-2`}>
            <ChevronLeft size={24} color="#2E3130" />
          </TouchableOpacity>
        )}
        {showProgress && (
          <View style={tw`items-center`}>
            <Text style={tw`text-charcoal/50 font-gabarito text-sm mb-1`}>
              Step {progressStep} of 3
            </Text>
            <View style={tw`w-32 h-1 bg-gray-100 rounded-full`}>
              <View
                style={[
                  tw`h-1 bg-indigo-400 rounded-full`,
                  { width: `${(progressStep / 3) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Animated step content */}
      <Animated.View
        style={[tw`flex-1`, { transform: [{ translateX }] }]}
      >
        {displayStep === 0 && (
          <WelcomeStep onNext={() => goForward(1)} />
        )}
        {displayStep === 1 && (
          <TransitionStep onNext={() => goForward(2)} />
        )}
        {displayStep === 2 && (
          <RelationshipStep
            selected={data.relationshipStatus}
            onSelect={(v) =>
              setData((d) => ({ ...d, relationshipStatus: v }))
            }
            onNext={() => goForward(3)}
          />
        )}
        {displayStep === 3 && (
          <FocusStep
            selected={data.focusAreas}
            onToggle={(key) =>
              setData((d) => ({
                ...d,
                focusAreas: d.focusAreas.includes(key)
                  ? d.focusAreas.filter((k) => k !== key)
                  : [...d.focusAreas, key],
              }))
            }
            onNext={() => goForward(4)}
          />
        )}
        {displayStep === 4 && (
          <GenderStep
            selected={data.gender}
            onSelect={(v) => setData((d) => ({ ...d, gender: v }))}
            onNext={handleStep4Next}
            isSubmitting={createProfileMutation.isPending}
          />
        )}
        {displayStep === 5 && (
          <AuthStep onSignup={handleSignup} />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit the shell (imports will fail until step files exist — that's expected)**

```bash
git add app/app/(onboard)/index.tsx
git commit -m "feat: add onboarding wizard shell with step state and slide animations"
```

---

## Task 5: Welcome and Transition steps

**Files:**
- Create: `app/app/(onboard)/steps/welcome.tsx`
- Create: `app/app/(onboard)/steps/transition.tsx`

- [ ] **Step 1: Create the steps directory**

```bash
mkdir -p app/app/\(onboard\)/steps
```

- [ ] **Step 2: Create `steps/welcome.tsx`**

```tsx
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onNext: () => void;
};

export function WelcomeStep({ onNext }: Props) {
  return (
    <View style={tw`flex-1 items-center justify-between px-6 py-20`}>
      <View style={tw`flex-1`} />

      <View style={tw`items-center gap-8 px-4`}>
        <View
          style={tw`w-32 h-32 rounded-full bg-grape/20 items-center justify-center mb-4`}
        >
          <Text style={tw`text-6xl`}>✨</Text>
        </View>

        <View style={tw`items-center gap-4`}>
          <Text
            style={tw`text-5xl text-charcoal font-gabarito font-black text-center leading-tight`}
          >
            Welcome to{"\n"}The Good Partner
          </Text>
          <Text
            style={tw`text-xl text-charcoal/80 font-gabarito text-center leading-relaxed px-6`}
          >
            Your partner in building stronger relationships through thoughtful
            actions
          </Text>
        </View>
      </View>

      <View style={tw`flex-1`} />

      <View style={tw`w-full gap-4`}>
        <Button onPress={onNext}>Get Started</Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Create `steps/transition.tsx`**

```tsx
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";

type Props = {
  onNext: () => void;
};

export function TransitionStep({ onNext }: Props) {
  return (
    <View style={tw`flex-1 items-center justify-between px-6 py-20`}>
      <View style={tw`flex-1`} />

      <View style={tw`items-center gap-6 px-4`}>
        <Text style={tw`text-5xl`}>💬</Text>
        <Text
          style={tw`text-4xl text-charcoal font-gabarito font-black text-center leading-tight`}
        >
          Three quick questions to make this yours.
        </Text>
        <Text
          style={tw`text-xl text-charcoal/80 font-gabarito text-center leading-relaxed`}
        >
          Takes less than a minute.
        </Text>
      </View>

      <View style={tw`flex-1`} />

      <View style={tw`w-full`}>
        <Button onPress={onNext}>Continue</Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/app/\(onboard\)/steps/
git commit -m "feat: add welcome and transition steps"
```

---

## Task 6: Relationship status and Gender steps

**Files:**
- Create: `app/app/(onboard)/steps/relationship.tsx`
- Create: `app/app/(onboard)/steps/gender.tsx`

Both are single-select steps using `PressableRadio`. They share the same visual pattern.

- [ ] **Step 1: Create `steps/relationship.tsx`**

```tsx
import PressableRadio from "@/components/ui/pressable-radio";
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";
import { ScrollView } from "react-native";

const OPTIONS = [
  { value: "great", label: "Really good, I just want to keep growing" },
  { value: "distance", label: "Mostly solid, but I sense some distance" },
  { value: "rough", label: "We're going through a rough patch" },
  { value: "crisis", label: "We've had a real crisis recently" },
];

type Props = {
  selected: string | null;
  onSelect: (value: string) => void;
  onNext: () => void;
};

export function RelationshipStep({ selected, onSelect, onNext }: Props) {
  return (
    <View style={tw`flex-1`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pt-6 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-8`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3 leading-tight`}
          >
            How would you describe your relationship right now?
          </Text>
        </View>

        <View style={tw`gap-3`}>
          {OPTIONS.map((option) => (
            <PressableRadio
              key={option.value}
              selected={selected === option.value}
              onPress={() => onSelect(option.value)}
              color="indigo"
              showColor
              shade={100}
            >
              <View style={tw`p-5`}>
                <Text
                  style={tw`font-gabarito text-lg text-charcoal font-medium`}
                >
                  {option.label}
                </Text>
              </View>
            </PressableRadio>
          ))}
        </View>
      </ScrollView>

      <View style={tw`p-6 pb-2`}>
        <Button onPress={onNext} disabled={!selected}>
          Continue
        </Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Create `steps/gender.tsx`**

```tsx
import PressableRadio from "@/components/ui/pressable-radio";
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";
import { ScrollView } from "react-native";

const OPTIONS = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

type Props = {
  selected: string | null;
  onSelect: (value: string) => void;
  onNext: () => void;
  isSubmitting?: boolean;
};

export function GenderStep({ selected, onSelect, onNext, isSubmitting }: Props) {
  return (
    <View style={tw`flex-1`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pt-6 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-8`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3 leading-tight`}
          >
            About you
          </Text>
          <Text style={tw`text-lg text-charcoal/80 font-gabarito leading-relaxed`}>
            This helps us tailor suggestions for you.
          </Text>
        </View>

        <View style={tw`gap-3`}>
          {OPTIONS.map((option) => (
            <PressableRadio
              key={option.value}
              selected={selected === option.value}
              onPress={() => onSelect(option.value)}
              color="indigo"
              showColor
              shade={100}
            >
              <View style={tw`p-5`}>
                <Text
                  style={tw`font-gabarito text-lg text-charcoal font-medium`}
                >
                  {option.label}
                </Text>
              </View>
            </PressableRadio>
          ))}
        </View>
      </ScrollView>

      <View style={tw`p-6 pb-2`}>
        <Button onPress={onNext} disabled={!selected || isSubmitting}>
          {isSubmitting ? "Setting up..." : "Continue"}
        </Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/app/\(onboard\)/steps/relationship.tsx app/app/\(onboard\)/steps/gender.tsx
git commit -m "feat: add relationship status and gender steps"
```

---

## Task 7: Focus areas step

**Files:**
- Create: `app/app/(onboard)/steps/focus.tsx`

This is the content from `areas.tsx` adapted as a wizard step component.

- [ ] **Step 1: Create `steps/focus.tsx`**

```tsx
import { CategoryButton } from "@/components/category-button";
import Button from "@/components/ui/button";
import { useGetCategories } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

const FOCUS_OPTIONS = {
  ATTENTION: {
    title: "Being more present & connected",
    description: "Focus on quality time and active listening",
    color: ActionTypes.ATTENTION.color,
  },
  AFFECTION: {
    title: "Showing more affection & appreciation",
    description: "Express love through words and actions",
    color: ActionTypes.AFFECTION.color,
  },
  INITIATIVE: {
    title: "Taking ownership & sharing mental load",
    description: "Plan dates and manage tasks together",
    color: ActionTypes.INITIATIVE.color,
  },
  REPAIR: {
    title: "Handling conflicts & emotions",
    description: "Build better communication and resolution skills",
    color: ActionTypes.REPAIR.color,
  },
};

type Props = {
  selected: string[];
  onToggle: (key: string) => void;
  onNext: () => void;
};

export function FocusStep({ selected, onToggle, onNext }: Props) {
  const { isLoading } = useGetCategories();

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pt-6 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-8`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3`}
          >
            Choose Your Focus
          </Text>
          <Text
            style={tw`text-lg text-charcoal/80 font-gabarito leading-relaxed`}
          >
            Select the areas you'd like to improve. You can choose multiple.
          </Text>
        </View>

        <View style={tw`mb-6`}>
          {Object.entries(FOCUS_OPTIONS).map(([key, value]) => (
            <View key={key} style={tw`mb-2`}>
              <CategoryButton
                text={value.title}
                description={value.description}
                color={value.color}
                category={key}
                onPress={onToggle}
                selected={selected.includes(key)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={tw`p-6 pb-2`}>
        <Button onPress={onNext} disabled={selected.length === 0}>
          Continue
        </Button>
        <View style={tw`h-5 mt-2`}>
          {selected.length === 0 && (
            <Text style={tw`text-charcoal/80 font-gabarito text-center`}>
              Please select at least one area to continue
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/app/\(onboard\)/steps/focus.tsx
git commit -m "feat: add focus areas step"
```

---

## Task 8: Auth step

**Files:**
- Create: `app/app/(onboard)/steps/auth.tsx`

- [ ] **Step 1: Create `steps/auth.tsx`**

```tsx
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import tw from "@/lib/tw";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FormValues = {
  email: string;
  password: string;
};

type Props = {
  onSignup: (email: string, password: string) => Promise<void>;
};

export function AuthStep({ onSignup }: Props) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async ({ email, password }: FormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await onSignup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
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
        contentContainerStyle={[
          tw`flex-grow px-6 justify-center`,
          { paddingBottom: insets.bottom + 16 },
        ]}
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
                  <Text style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}>
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
                  <Text style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}>
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
            <Text style={tw`text-red-600 font-gabarito text-base leading-relaxed`}>
              {error}
            </Text>
          </View>
        )}

        <Button disabled={isLoading} onPress={handleSubmit(onSubmit)}>
          {isLoading ? "Creating account..." : "Let's go →"}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/app/\(onboard\)/steps/auth.tsx
git commit -m "feat: add auth signup step"
```

---

## Task 9: Delete areas.tsx and verify

**Files:**
- Delete: `app/app/(onboard)/areas.tsx`

- [ ] **Step 1: Delete areas.tsx**

```bash
rm app/app/\(onboard\)/areas.tsx
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors. If there are import errors, track down any other files importing from `areas` and remove/update them.

- [ ] **Step 3: Run the app and manually walk through the full flow**

```bash
cd app && npx expo start
```

Verify:
1. Unauthenticated user → Welcome (step 0)
2. "Get Started" → Transition (step 1)
3. "Continue" → Relationship status (step 2) with progress "Step 1 of 3" and back button
4. Select an option → "Continue" → Focus (step 3) with "Step 2 of 3"
5. Select focus areas → "Continue" → Gender (step 4) with "Step 3 of 3"
6. Select gender → "Continue" → Auth (step 5, no back button, no progress)
7. Enter email + password → "Let's go →" → profile created → redirected to tabs
8. Back-navigation (tap back arrow on steps 2–4) reverses slide animation
9. Open app as authenticated user with no profile → starts at step 2 (relationship)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete onboarding wizard — remove areas.tsx"
```
