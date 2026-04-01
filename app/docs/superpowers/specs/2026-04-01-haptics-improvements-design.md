# Haptics Improvements — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Overview

Pepper haptic feedback at five high-value moments that are currently missing or broken. All UI primitives (Button, PressableCard, PressableRadio, Switch) already have press-level haptics. This spec targets the meaningful *outcome* moments — action completion, activation, feedback selection — plus a double-haptic bug fix.

No new dependencies. All changes use the existing `useHaptics()` hook from `hooks/use-haptics.ts`.

---

## Changes

### 1. SuccessScreen mount
**File:** `components/feedback/SuccessScreen.tsx`

Add `useHaptics()` and fire `trigger("success")` in a `useEffect` with empty deps on mount. The haptic lands the moment the screen appears, punctuating the confetti + animation celebration.

### 2. Action completion — async callbacks
**Files:**
- `components/home/active-actions.tsx` — `handleComplete`
- `app/(action)/[id].tsx` — `handleComplete`

In each handler, call `trigger("success")` after `completeAction.mutateAsync` resolves (before the `router.replace` to the success screen). The Button press-in already fires `impactLight`; this adds a confirming `success` haptic when the server actually confirms the action.

### 3. Action activation
**File:** `app/(action)/[id].tsx` — `handleActivate`

Call `trigger("impactMedium")` after `activateAction.mutateAsync` resolves (before the router navigation). Activating an action is a deliberate commitment; medium impact fits the weight of that decision.

### 4. CategoryButton double-haptic fix
**File:** `components/category-button.tsx`

Remove `trigger("impactMedium")` from the `onPress` handler. `PressableRadio` already fires `impactLight` on press-in. The current code fires two haptics per tap; removing the `onPress` one leaves one clean press-in haptic. The `useHaptics()` import and `trigger` usage can be removed entirely from this file.

### 5. Feedback selection
**File:** `components/feedback/FeedbackWizard.tsx`

Add `useHaptics()` and call `trigger` in `handleFeltSelect` before the mutation, varying by felt value:
- `neutral` → `trigger("impactLight")`
- `good` → `trigger("impactMedium")`
- `great` → `trigger("success")`

Escalating weight mirrors the emotional escalation of the options.

---

## Preset reference

| Preset | Feel | Used for |
|---|---|---|
| `impactLight` | Crisp, subtle | Press-level interactions, neutral feedback |
| `impactMedium` | Stronger, definitive | Action activation, good feedback |
| `success` | Double-tap (tap-TAP) | Action complete, great feedback, success screen |

---

## Out of scope

- Time picker scroll wheel haptics
- Deactivate/pause action haptics
- Haptic choreography timed to SuccessScreen animations
- Any new haptic presets
