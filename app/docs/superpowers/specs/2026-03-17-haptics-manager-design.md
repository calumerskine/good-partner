# Haptics Manager — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Add a centralised haptics system to the app with six semantic presets, a user-controlled on/off toggle persisted locally, and a settings screen entry.

`expo-haptics` is already installed. No new dependencies required.

---

## Files

| File | Role |
|---|---|
| `lib/haptics.ts` | Private preset → `expo-haptics` mapping |
| `hooks/use-haptics.ts` | Public API: `trigger`, `hapticsEnabled`, `toggleHaptics` |
| `app/(tabs)/(settings)/index.tsx` | Add haptics Switch row to settings screen |

---

## Presets

| Name | When to use | Feel | `expo-haptics` call |
|---|---|---|---|
| `selection` | Scrolling through a picker, moving a slider, switching tabs | Light tick | `selectionAsync()` |
| `impactLight` | Button presses, checkbox toggles, liking a post | Crisp and subtle | `impactAsync(ImpactFeedbackStyle.Light)` |
| `impactMedium` | Deleting an item, closing a modal, physical collision | Stronger, more definitive | `impactAsync(ImpactFeedbackStyle.Medium)` |
| `success` | Payment completed, form submitted | Double-tap (tap-TAP) | `notificationAsync(NotificationFeedbackType.Success)` |
| `warning` | Reaching a limit, soft validation error | Slow, heavy pulse | `notificationAsync(NotificationFeedbackType.Warning)` |
| `error` | FaceID failed, incorrect password, major system error | Three quick sharp pulses | `notificationAsync(NotificationFeedbackType.Error)` |

---

## `lib/haptics.ts`

An internal module — imported by `hooks/use-haptics.ts` only, not by components or screens directly. Exports two things:
- `HapticPreset` — the exported union type of the six preset name strings (exported so `hooks/use-haptics.ts` can re-export it for call-site typing)
- `triggerPreset(preset: HapticPreset)` — maps preset names to their `expo-haptics` calls

---

## `hooks/use-haptics.ts`

Public API. Mirrors the shape of `use-reminder-prompt.ts`.

**Storage key:** `@good-partner/haptics-enabled`
**Default:** `true` (on by default; treat unknown/unset as enabled)

**Re-exports:** `HapticPreset` from `lib/haptics.ts` so callers only need one import.

**Internal state:**
- `hapticsEnabled: boolean` — initialised as `false` (`useState(false)`); set to stored value (or `true` if absent) once the AsyncStorage read completes
- `loaded: boolean` — initialised as `false`; set to `true` after the AsyncStorage read completes

**Returns:**

```ts
{
  hapticsEnabled: boolean,   // false until loaded, then reflects stored value (default true)
  loaded: boolean,           // true once AsyncStorage read has completed
  toggleHaptics: () => void, // stable via useCallback([hapticsEnabled])
  trigger: (preset: HapticPreset) => void, // stable via useCallback([hapticsEnabled])
}
```

**Behaviour:**
- Reads preference from AsyncStorage on mount. On completion: sets `hapticsEnabled` to the stored boolean value, or `true` if the key is absent or unreadable (`.catch(() => { setHapticsEnabled(true); setLoaded(true); })`). Sets `loaded` to `true`.
- `hapticsEnabled` is `false` before `loaded` (due to `useState(false)`). This prevents the settings Switch showing a transient wrong state. `trigger` also no-ops before `loaded` because `hapticsEnabled` is `false` — acceptable since all haptic call sites are user-initiated interactions and the cold-start window will never be reached in practice.
- `toggleHaptics`: `useCallback` with `[hapticsEnabled]` dep. Reads current `hapticsEnabled`, flips it optimistically via `setHapticsEnabled`, writes new value to AsyncStorage (fire-and-forget, `.catch(() => {})`).
- `trigger`: `useCallback` with `[hapticsEnabled]` dep. No-ops if `!hapticsEnabled`; otherwise calls `triggerPreset(preset)` from `lib/haptics.ts`. Return type `void` — fire-and-forget.

**`lib/haptics.ts` async handling:** `triggerPreset` calls expo-haptics async functions (e.g. `selectionAsync()`) without `await`, attaching `.catch(() => {})` to suppress unhandled promise rejections. The return type of `triggerPreset` is `void`.

---

## Settings Screen

Add a new **"Preferences"** section immediately after "Your focus areas" (and before "Notifications" when that section is present; when `env.flags.useReminders` is off, "Preferences" simply follows "Your focus areas" with no gap):

```
Preferences                        ← text-lg font-gabarito font-bold text-charcoal mb-3
┌──────────────────────────────────────────────────┐
│ Haptics                          [Switch]         │  ← flex-row items-center justify-between mb-3
│ Vibration feedback on interactions.               │  ← font-gabarito text-sm text-charcoal/80
└──────────────────────────────────────────────────┘
```

- Outer wrapper: `mb-6 View`, unconditional (no feature flag), placed as a static JSX sibling between the focus areas `mb-6` View and the `{env.flags.useReminders && ...}` Notifications block
- Card: `bg-white border-2 rounded-xl p-5` (no `mb-3` on the card itself — section spacing comes from the outer `mb-6` wrapper, matching the Notifications section's structure)
- Section heading: `text-lg font-gabarito font-bold text-charcoal mb-3` (same as Notifications heading)
- Switch bound to `hapticsEnabled` / `toggleHaptics` from `useHaptics()`; render Switch only when `loaded` is true (use `loaded` from the hook return) to avoid transient flicker
- No feature flag needed

---

## Error Handling

- AsyncStorage read failure on mount: silently default to `true` (haptics enabled)
- AsyncStorage write failure on toggle: best-effort, same pattern as `use-reminder-prompt`
- `expo-haptics` calls are fire-and-forget; no error handling needed (device may silently ignore if haptics unavailable)

---

## Out of Scope

- Server-side persistence of haptics preference (local-only is sufficient)
- Haptics in non-React contexts (all call sites are components)
- Per-preset enable/disable granularity
