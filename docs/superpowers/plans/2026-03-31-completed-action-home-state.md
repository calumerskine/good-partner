# Completed Action Home State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third home screen state shown when a user has completed an action today but has no active actions — displaying the completed action card with a success badge and contextual CTAs.

**Architecture:** Add a `useGetTodayCompletedAction` API hook that queries completions since midnight local time. Extend `ActionCard` in `active-actions.tsx` with a `completed` prop for visual variants. Create a new `CompletedAction` component. Wire the new state into the home screen's render logic with a `showSuggestedFlow` escape hatch.

**Tech Stack:** React Native, Expo Router, TanStack Query, Supabase, lucide-react-native, TailwindCSS via `tw`

---

## File Map

| File | Change |
|------|--------|
| `app/lib/api.ts` | Add `queryKeys.todayCompletedAction`, `useGetTodayCompletedAction`, `getTodayCompletedAction` |
| `app/components/home/active-actions.tsx` | Export `ActionCard`, add `completed?: boolean` prop |
| `app/components/home/completed-action.tsx` | **Create** — new CompletedAction component |
| `app/app/(tabs)/(home)/index.tsx` | Add new query + `showSuggestedFlow` state + updated render logic |

---

## Task 1: Add `useGetTodayCompletedAction` to `api.ts`

**Files:**
- Modify: `app/lib/api.ts`

- [ ] **Step 1: Add the query key**

In `app/lib/api.ts`, add to the `queryKeys` object (after the `actionNotificationsEnabled` entry on line 26):

```ts
  todayCompletedAction: (userId: string) =>
    ["todayCompletedAction", userId] as const,
```

- [ ] **Step 2: Add the exported hook and private function**

Add these two functions after `useGetAllUserActions` (around line 892). Insert them as a new block:

```ts
/**
 * Get the most recent action completed today (since midnight local time).
 * Returns null if no action was completed today.
 */
export function useGetTodayCompletedAction(userId?: string) {
  return useQuery({
    queryKey: queryKeys.todayCompletedAction(userId!),
    queryFn: () => getTodayCompletedAction(userId!),
    enabled: !!userId,
  });
}

async function getTodayCompletedAction(
  userId: string,
): Promise<UserAction | null> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("completions")
    .select(
      `
      id,
      created_at,
      user_action_id,
      user_actions!inner (
        id,
        action_id,
        user_id,
        activated_at,
        is_active,
        reminder_at,
        actions (
          id,
          title,
          description,
          reasoning,
          action_categories (
            name
          )
        )
      )
    `,
    )
    .eq("user_actions.user_id", userId)
    .gte("created_at", dayStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !(data as any).user_actions) {
    return null;
  }

  const ua = (data as any).user_actions;

  if (!ua.actions) {
    return null;
  }

  return {
    id: ua.id,
    actionId: ua.action_id,
    userId: ua.user_id,
    activatedAt: new Date(ua.activated_at),
    isActive: ua.is_active,
    completionCount: 1,
    reminderAt: ua.reminder_at ? new Date(ua.reminder_at) : null,
    action: {
      id: ua.actions.id,
      category: ua.actions.action_categories?.name || "",
      title: ua.actions.title,
      description: ua.actions.description,
      reasoning: ua.actions.reasoning,
    },
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "api\.ts|error" | head -20
```

Expected: no errors referencing `api.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/lib/api.ts
git commit -m "feat: add useGetTodayCompletedAction API hook"
```

---

## Task 2: Extend `ActionCard` in `active-actions.tsx`

**Files:**
- Modify: `app/components/home/active-actions.tsx`

- [ ] **Step 1: Add `Check` to the lucide import**

Change the import at the top of `app/components/home/active-actions.tsx`:

```ts
// Before (line 9):
import { format, isBefore, isToday, isTomorrow } from "date-fns";

// The lucide import is not currently present — add it after line 8:
import { Check } from "lucide-react-native";
```

Line 1-10 of the file currently reads:
```ts
import { useMountAnimation } from "@/hooks/animations";
import { UserAction, useCompleteAction, useDeactivateAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import { env } from "@/lib/env";
import tw from "@/lib/tw";
import { Link, router } from "expo-router";
import { useCallback } from "react";
import { Animated, Text, View } from "react-native";
import { format, isBefore, isToday, isTomorrow } from "date-fns";
import Button from "../ui/button";
```

Add `import { Check } from "lucide-react-native";` after the `date-fns` import.

- [ ] **Step 2: Add `completed` prop and update the card header + badge**

Replace the entire `ActionCard` function (lines 13–71) with:

```tsx
export function ActionCard({
  item,
  completed = false,
}: {
  item: UserAction;
  completed?: boolean;
}) {
  const categoryInfo =
    ActionTypes[item.action.category as keyof typeof ActionTypes];

  const firstSentence = item.action.description
    ? item.action.description.substring(
        0,
        item.action.description.indexOf(".") + 1,
      )
    : "";

  return (
    <PressableCard
      color={categoryInfo.color}
      shade={200}
      showShadow
      fillHeight
      style={tw`h-76`}
      onPress={() => router.push(`/(action)/${item.id}` as any)}
    >
      <View style={tw`p-6 items-start flex-1`}>
        <View
          style={tw`flex flex-row justify-between items-baseline w-full pb-4`}
        >
          <View style={tw`flex flex-row items-center gap-2`}>
            {completed ? (
              <>
                <Text style={tw`font-bold`}>Completed</Text>
                <Check size={14} color="#16a34a" strokeWidth={3} />
              </>
            ) : (
              <>
                <Text style={tw`font-bold`}>In Progress</Text>
                <View
                  style={tw`bg-green-400 border-green-500 border w-3 h-3 rounded-full`}
                />
              </>
            )}
          </View>
          <View
            style={tw`bg-${categoryInfo.color}-300 rounded-lg flex flex-row items-center px-3 py-1`}
          >
            <Text style={tw`uppercase font-gabarito font-medium mr-2 text-sm`}>
              {categoryInfo.title}
            </Text>
            {categoryInfo.icon()}
          </View>
        </View>
        <View style={tw`flex-1 mt-2`}>
          <Text
            style={tw`text-2xl font-gabarito font-bold text-black`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.action.title}
          </Text>
          <Text
            style={tw`text-lg text-black font-gabarito leading-relaxed mt-3`}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {firstSentence}
          </Text>
        </View>
        {completed && (
          <View
            style={tw`absolute bottom-4 left-4 w-8 h-8 rounded-full bg-green-500 items-center justify-center`}
          >
            <Check size={16} color="white" strokeWidth={3} />
          </View>
        )}
      </View>
    </PressableCard>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "active-actions|error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/home/active-actions.tsx
git commit -m "feat: export ActionCard with completed variant and badge"
```

---

## Task 3: Create `completed-action.tsx`

**Files:**
- Create: `app/components/home/completed-action.tsx`

- [ ] **Step 1: Create the file**

Create `app/components/home/completed-action.tsx` with the following content:

```tsx
import { useMountAnimation } from "@/hooks/animations";
import { UserAction } from "@/lib/api";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { Animated, Text, View } from "react-native";
import { ActionCard } from "./active-actions";
import Button from "../ui/button";

export default function CompletedAction({
  action,
  streakDays,
  onDoAnother,
}: {
  action: UserAction;
  streakDays: number;
  onDoAnother: () => void;
}) {
  const headingAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 0,
  });
  const cardsAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 80,
  });
  const buttonsAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 160,
  });

  const progressLabel =
    streakDays >= 3
      ? `🔥 You're on a ${streakDays}-day streak`
      : "See your progress";

  return (
    <View style={tw`flex-1 flex-col`}>
      <Animated.View style={headingAnim.animatedStyle}>
        <View style={tw`flex-row items-center gap-2 mb-4`}>
          <Check size={22} color="#2E3130" strokeWidth={2.5} />
          <Text style={tw`text-2xl text-black font-gabarito font-bold`}>
            Done for today.
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[tw`flex-1`, cardsAnim.animatedStyle]}>
        <View style={tw`flex-1 pb-4`}>
          <ActionCard item={action} completed />
        </View>
      </Animated.View>

      <Animated.View style={[tw`pb-2 gap-3`, buttonsAnim.animatedStyle]}>
        <Button
          color="green"
          style="min-w-full"
          onPress={() => router.push("/(tabs)/(progress)" as any)}
        >
          {progressLabel}
        </Button>
        <Button color="ghost" size="sm" onPress={onDoAnother}>
          Do Another
        </Button>
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "completed-action|error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/home/completed-action.tsx
git commit -m "feat: add CompletedAction home screen component"
```

---

## Task 4: Wire into the home screen

**Files:**
- Modify: `app/app/(tabs)/(home)/index.tsx`

- [ ] **Step 1: Add new import + query + state**

At the top of `app/app/(tabs)/(home)/index.tsx`, add the import for `CompletedAction`:

```ts
import CompletedAction from "@/components/home/completed-action";
```

Add `useGetTodayCompletedAction` to the existing API import block:

```ts
// Before:
import {
  useGetActiveActions,
  useGetDailyContent,
  useGetUserProfile,
} from "@/lib/api";

// After:
import {
  useGetActiveActions,
  useGetDailyContent,
  useGetTodayCompletedAction,
  useGetUserProfile,
} from "@/lib/api";
```

Inside `HomeScreen`, add the new query and state after the existing queries (after line 26):

```ts
const { data: todayCompletedAction = null, isLoading: isTodayLoading } =
  useGetTodayCompletedAction(user?.id);
const [showSuggestedFlow, setShowSuggestedFlow] = useState(false);
```

- [ ] **Step 2: Update the loading guard**

Change the loading condition from:

```ts
if (isLoading || isProfileLoading) {
```

to:

```ts
if (isLoading || isProfileLoading || isTodayLoading) {
```

- [ ] **Step 3: Replace the render logic**

Replace the current conditional render block (lines 62–81 in the original file):

```tsx
// Before:
{userActions.length > 0 ? (
  <ActiveActions
    isLoading={isLoading}
    userActions={userActions}
    onRemind={setReminderSheetActionId}
  />
) : (
  <SuggestedActions
    user={user}
    profile={profile}
    isLoading={isLoading}
  />
)}
```

with:

```tsx
{showSuggestedFlow ? (
  <SuggestedActions
    user={user}
    profile={profile}
    isLoading={isLoading}
  />
) : userActions.length > 0 ? (
  <ActiveActions
    isLoading={isLoading}
    userActions={userActions}
    onRemind={setReminderSheetActionId}
  />
) : todayCompletedAction ? (
  <CompletedAction
    action={todayCompletedAction}
    streakDays={profile?.currentStreakDays ?? 0}
    onDoAnother={() => setShowSuggestedFlow(true)}
  />
) : (
  <SuggestedActions
    user={user}
    profile={profile}
    isLoading={isLoading}
  />
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "home/index|error" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/app/(tabs)/(home)/index.tsx
git commit -m "feat: wire CompletedAction state into home screen"
```

---

## Manual Verification Checklist

After all tasks complete, test these flows in the simulator:

- [ ] Complete an action → navigate home → see "Done for today." card with Completed header + badge
- [ ] Streak < 3: primary CTA shows "See your progress" → taps to progress tab
- [ ] Streak ≥ 3: primary CTA shows "🔥 You're on a X-day streak" → taps to progress tab
- [ ] "Do Another" → immediately shows suggested actions flow, completed card gone
- [ ] Kill and restart app → still shows completed card (query re-fetches from DB)
- [ ] Active action present → home still shows `ActiveActions`, not completed state
- [ ] Force-set device time to next calendar day → home shows suggested actions again
