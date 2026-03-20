# Haptics Manager Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centralised haptics system with six semantic presets, a user-controlled on/off toggle persisted locally in AsyncStorage, and a toggle row in the settings screen.

**Architecture:** `lib/haptics.ts` is an internal mapping layer from preset names to `expo-haptics` calls. `hooks/use-haptics.ts` is the only public API — it wraps the preference state, AsyncStorage persistence, and the `trigger` function into a single hook. The settings screen consumes the hook directly.

**Tech Stack:** TypeScript, `expo-haptics` (already installed), `@react-native-async-storage/async-storage` (already installed), React hooks (`useState`, `useEffect`, `useCallback`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/haptics.ts` | `HapticPreset` type + `triggerPreset()` mapping |
| Create | `hooks/use-haptics.ts` | Public hook: state, persistence, `trigger`, `toggleHaptics` |
| Modify | `app/(tabs)/(settings)/index.tsx` | Add Preferences section with haptics Switch |

---

## Task 1: Create `lib/haptics.ts`

**Files:**
- Create: `lib/haptics.ts`

This file owns the mapping from the six preset names to their `expo-haptics` calls. It is the only file in the project that imports `expo-haptics`. Each call is fire-and-forget — no awaiting, `.catch(() => {})` on each to suppress unhandled rejection warnings.

- [ ] **Step 1: Create `lib/haptics.ts`**

```ts
import * as Haptics from "expo-haptics";

export type HapticPreset =
  | "selection"
  | "impactLight"
  | "impactMedium"
  | "success"
  | "warning"
  | "error";

export function triggerPreset(preset: HapticPreset): void {
  switch (preset) {
    case "selection":
      Haptics.selectionAsync().catch(() => {});
      break;
    case "impactLight":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      break;
    case "impactMedium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {},
      );
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
      break;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/haptics.ts
git commit -m "feat: add haptics preset mapping"
```

---

## Task 2: Create `hooks/use-haptics.ts`

**Files:**
- Create: `hooks/use-haptics.ts`

This hook is the only public API consumers use. It reads/writes a boolean from AsyncStorage, exposes `hapticsEnabled` + `loaded` state, and provides `trigger` and `toggleHaptics` actions.

Key details:
- `useState(false)` for both `hapticsEnabled` and `loaded` — both flip after the AsyncStorage read completes
- AsyncStorage key: `@good-partner/haptics-enabled`
- Missing/unreadable key → default to `true` (haptics on)
- Both `toggleHaptics` and `trigger` wrapped in `useCallback([hapticsEnabled])` for render stability
- Re-exports `HapticPreset` so call sites only need one import

- [ ] **Step 1: Create `hooks/use-haptics.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { type HapticPreset, triggerPreset } from "@/lib/haptics";

export type { HapticPreset };

const STORAGE_KEY = "@good-partner/haptics-enabled";

export function useHaptics() {
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        // null = key absent (first run) → default to true
        setHapticsEnabled(value === null ? true : value === "true");
        setLoaded(true);
      })
      .catch(() => {
        setHapticsEnabled(true);
        setLoaded(true);
      });
  }, []);

  const toggleHaptics = useCallback(() => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
  }, [hapticsEnabled]);

  const trigger = useCallback(
    (preset: HapticPreset) => {
      if (!hapticsEnabled) return;
      triggerPreset(preset);
    },
    [hapticsEnabled],
  );

  return { hapticsEnabled, loaded, toggleHaptics, trigger };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add hooks/use-haptics.ts
git commit -m "feat: add useHaptics hook with AsyncStorage persistence"
```

---

## Task 3: Add haptics toggle to settings screen

**Files:**
- Modify: `app/(tabs)/(settings)/index.tsx`

Add a "Preferences" section as an unconditional `mb-6 View` inserted between the focus areas block and the `{env.flags.useReminders && ...}` Notifications block. The section heading and card styles match the existing Notifications section exactly. The Switch renders only when `loaded` is true (avoids a transient off→on flicker on mount).

- [ ] **Step 1: Add `useHaptics` import to the settings screen**

In `app/(tabs)/(settings)/index.tsx`, add to the existing imports:

```ts
import { useHaptics } from "@/hooks/use-haptics";
```

- [ ] **Step 2: Call the hook inside `SettingsScreen`**

Add this line alongside the existing hook calls near the top of the component:

```ts
const { hapticsEnabled, loaded: hapticsLoaded, toggleHaptics } = useHaptics();
```

- [ ] **Step 3: Insert the Preferences section**

Find the existing focus areas closing `</View>` tag (the one with `style={tw\`mb-6\`}` that wraps the focus areas card). Insert the following block immediately after it, before the `{env.flags.useReminders && (` block:

```tsx
<View style={tw`mb-6`}>
  <Text style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}>
    Preferences
  </Text>
  <View style={tw`bg-white border-2 rounded-xl p-5`}>
    <View style={tw`flex-row items-center justify-between mb-3`}>
      <Text style={tw`text-charcoal font-gabarito font-bold text-lg`}>
        Haptics
      </Text>
      {hapticsLoaded && (
        <Switch
          value={hapticsEnabled}
          onValueChange={toggleHaptics}
        />
      )}
    </View>
    <Text
      style={tw`font-gabarito text-sm text-charcoal/80 leading-relaxed`}
    >
      Vibration feedback on interactions.
    </Text>
  </View>
</View>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Manual smoke test on device/simulator**

1. Open the Settings screen — confirm "Preferences" section appears above "Notifications" (or above "Account" if reminders flag is off)
2. Confirm the Switch loads in the correct initial state (on for new install)
3. Toggle haptics off — confirm the Switch flips and the preference is saved (reload the app and confirm it stays off)
4. Toggle haptics back on
5. Navigate to any screen with a button — confirm haptic fires on press
6. Toggle off again, press the same button — confirm no haptic

- [ ] **Step 6: Commit**

```bash
git add app/\(tabs\)/\(settings\)/index.tsx
git commit -m "feat: add haptics toggle to settings screen"
```
