# Haptics Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add haptic feedback at five high-value moments currently missing, and fix a double-haptic bug in CategoryButton.

**Architecture:** All changes use the existing `useHaptics()` hook (`hooks/use-haptics.ts`). No new files, no new presets. Four files get haptics added at async-resolution or mount moments; one file gets a redundant haptic removed.

**Tech Stack:** React Native, Expo, `expo-haptics` (via `hooks/use-haptics.ts`)

---

## File Map

| File | Change |
|---|---|
| `components/feedback/SuccessScreen.tsx` | Add `success` haptic on mount |
| `components/home/active-actions.tsx` | Add `success` haptic after `completeAction.mutateAsync` resolves |
| `app/(action)/[id].tsx` | Add `success` after complete resolves; `impactMedium` after activate resolves |
| `components/category-button.tsx` | Remove `trigger("impactMedium")` from `onPress`; remove `useHaptics` entirely |
| `components/feedback/FeedbackWizard.tsx` | Add per-felt haptic in `handleFeltSelect` |

> Note: haptic calls are fire-and-forget side effects on physical hardware — they cannot be meaningfully unit-tested. Verification is manual (run on device/simulator with haptics enabled).

---

### Task 1: SuccessScreen — `success` haptic on mount

**Files:**
- Modify: `components/feedback/SuccessScreen.tsx`

- [ ] **Step 1: Add `useHaptics` import and trigger on mount**

In `SuccessScreen.tsx`, add the import and hook call at the top of the `SuccessScreen` component, alongside the existing `useState` calls. Add a `useEffect` with empty deps that fires `trigger("success")` once on mount.

```tsx
// Add to imports at top of file
import { useHaptics } from "@/hooks/use-haptics";
```

Inside the `SuccessScreen` component (after the existing `useState` lines):

```tsx
const { trigger } = useHaptics();

useEffect(() => {
  trigger("success");
}, []);
```

The full opening of `SuccessScreen` should look like:

```tsx
export default function SuccessScreen({
  category,
  previousXp,
  newXp,
  onNext,
}: {
  category: ActionType;
  previousXp: number;
  newXp: number;
  onNext: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const prevLevel = getLevelForXp(previousXp);
  const newLevel = getLevelForXp(newXp);
  const isLevelUp = prevLevel.level !== newLevel.level;
  const [showLevelUp, setShowLevelUp] = useState(false);
  const { trigger } = useHaptics();

  useEffect(() => {
    trigger("success");
  }, []);
```

- [ ] **Step 2: Verify**

Run the app, complete an action. On the success screen appearing, you should feel the double-tap `success` haptic.

- [ ] **Step 3: Commit**

```bash
git add app/components/feedback/SuccessScreen.tsx
git commit -m "feat: add success haptic on action completion screen mount"
```

---

### Task 2: `active-actions.tsx` — `success` haptic after completion resolves

**Files:**
- Modify: `components/home/active-actions.tsx`

- [ ] **Step 1: Add `useHaptics` to `ActionCardButtons` and fire after mutation resolves**

`ActionCardButtons` (the inner component starting at line 128) already imports from `@/lib/api` — add `useHaptics` import and hook call, then fire `trigger("success")` immediately after the `mutateAsync` resolves.

```tsx
// Add to imports at top of file (alongside existing imports)
import { useHaptics } from "@/hooks/use-haptics";
```

Inside `ActionCardButtons`, add the hook and update `handleComplete`:

```tsx
function ActionCardButtons({
  item,
  onRemind,
}: {
  item: UserAction;
  onRemind: () => void;
}) {
  const categoryInfo =
    ActionTypes[item.action.category as keyof typeof ActionTypes];
  const completeAction = useCompleteAction();
  const deactivateAction = useDeactivateAction();
  const { trigger } = useHaptics();

  const handleComplete = useCallback(async () => {
    try {
      const completion = await completeAction.mutateAsync(item.id);
      trigger("success");
      trackEvent("action_completed_from_home", { action_id: item.id });
      router.replace(
        `/(action)/${item.id}/success?completionId=${completion.id}&categoryId=${item.action.category}&previousXp=${completion.previousXp}&newXp=${completion.newXp}` as any,
      );
    } catch (error) {
      console.error("Error completing action:", error);
    }
  }, [completeAction, item.id, item.action.category, trigger]);
```

- [ ] **Step 2: Verify**

Tap "I've done it!" from the home screen. You should feel `impactLight` on button press-in (existing), then `success` when the server responds before navigating.

- [ ] **Step 3: Commit**

```bash
git add app/components/home/active-actions.tsx
git commit -m "feat: add success haptic when action completes from home screen"
```

---

### Task 3: `[id].tsx` — `success` on complete, `impactMedium` on activate

**Files:**
- Modify: `app/(action)/[id].tsx`

- [ ] **Step 1: Add `useHaptics` import**

```tsx
// Add to imports at top of file
import { useHaptics } from "@/hooks/use-haptics";
```

- [ ] **Step 2: Add hook and update `handleActivate` and `handleComplete`**

Inside `ActionDetailScreen`, add the hook call and update both handlers:

```tsx
const { trigger } = useHaptics();
```

Update `handleActivate` to fire `impactMedium` after the mutation resolves:

```tsx
const handleActivate = async () => {
  if (!user || !actionData.id) return;

  try {
    await activateAction.mutateAsync({
      userId: user.id,
      actionId: isCatalogView ? id : actionData.id,
    });
    trigger("impactMedium");
    trackEvent("action_activated", { action_id: actionData.id });

    if (shouldPrompt) {
      markShown();
      router.replace(`/(action)/${id}/reminders` as any);
    } else {
      router.replace("/(tabs)/(home)");
    }
  } catch (error) {
    console.error("Error activating action:", error);
  }
};
```

Update `handleComplete` to fire `success` after the mutation resolves:

```tsx
const handleComplete = async () => {
  if (!id || isCatalogView) return;

  try {
    const completion = await completeAction.mutateAsync(id);
    trigger("success");
    trackEvent("action_completed", { action_id: id });
    router.replace(
      `/(action)/${id}/success?completionId=${completion.id}&categoryId=${actionData.category}&previousXp=${completion.previousXp}&newXp=${completion.newXp}` as any,
    );
  } catch (error) {
    console.error("Error completing action:", error);
  }
};
```

- [ ] **Step 3: Verify**

Activate an action from the detail screen — feel `impactMedium` before navigating home. Complete an action from the detail screen — feel `success` before navigating to success screen.

- [ ] **Step 4: Commit**

```bash
git add "app/app/(action)/[id].tsx"
git commit -m "feat: add haptics on action activate and complete in detail screen"
```

---

### Task 4: `category-button.tsx` — remove double-haptic

**Files:**
- Modify: `components/category-button.tsx`

- [ ] **Step 1: Remove `useHaptics` usage**

`PressableRadio` (used inside `CategoryButton`) already fires `impactLight` on press-in. The `trigger("impactMedium")` in `onPress` causes a second haptic. Remove it.

Remove the import:
```tsx
// DELETE this line:
import { useHaptics } from "@/hooks/use-haptics";
```

Remove the hook call inside `CategoryButton`:
```tsx
// DELETE this line:
const { trigger } = useHaptics();
```

Update the `onPress` handler to remove the trigger call:
```tsx
<PressableRadio
  onPress={() => {
    onPress(category);
  }}
  selected={selected ?? false}
  shade={300}
  deepFactor={1}
>
```

- [ ] **Step 2: Verify**

Press a category button during onboarding or on the focus areas screen. You should feel exactly one `impactLight` (from PressableRadio press-in), not two haptics.

- [ ] **Step 3: Commit**

```bash
git add app/components/category-button.tsx
git commit -m "fix: remove duplicate haptic in CategoryButton onPress"
```

---

### Task 5: `FeedbackWizard.tsx` — per-felt haptics

**Files:**
- Modify: `components/feedback/FeedbackWizard.tsx`

- [ ] **Step 1: Add `useHaptics` and fire escalating haptics in `handleFeltSelect`**

```tsx
// Add to imports at top of file
import { useHaptics } from "@/hooks/use-haptics";
```

Inside `FeedbackWizard`, add the hook and update `handleFeltSelect`:

```tsx
const { trigger } = useHaptics();

const handleFeltSelect = async (value: FeltValue) => {
  if (value === "neutral") trigger("impactLight");
  else if (value === "good") trigger("impactMedium");
  else if (value === "great") trigger("success");

  setFelt(value);
  trackEvent("feedback_felt_selected", { value });
  try {
    await submitFeedback.mutateAsync({
      completionId,
      felt: value,
    });
    trackEvent("feedback_submitted", { felt: value });
    onComplete();
  } catch (error) {
    console.error("Error submitting feedback:", error);
  }
};
```

- [ ] **Step 2: Verify**

After completing an action, on the "How did it go?" screen, tap each option:
- Neutral → light tap
- Good → medium tap
- Great → double-tap success feel

- [ ] **Step 3: Commit**

```bash
git add app/components/feedback/FeedbackWizard.tsx
git commit -m "feat: add escalating haptics to feedback felt selection"
```
