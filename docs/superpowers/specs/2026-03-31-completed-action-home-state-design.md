# Completed Action Home State

**Date:** 2026-03-31  
**Status:** Approved

## Overview

Add a third home screen state — `CompletedAction` — shown when a user has completed an action today but has no currently active actions. Sits between the existing `ActiveActions` and `SuggestedActions` states.

## State Machine

Render priority in `app/(tabs)/(home)/index.tsx`:

1. `showSuggestedFlow === true` → `<SuggestedActions />`
2. `userActions.length > 0` → `<ActiveActions />`
3. `todayCompletedAction !== null` → `<CompletedAction />`
4. else → `<SuggestedActions />`

"Today" is defined as the current calendar day from midnight local time. No morning reminder time is used for this boundary.

## Data Layer

### New hook: `useGetTodayCompletedAction(userId?)`

Added to `app/lib/api.ts`.

- Computes `dayStart` = today at `00:00:00` local time, converted to ISO string
- Queries `completions` table: `created_at >= dayStart`, joined to `user_actions` (filtered by `user_id`) and `actions` (via `action_categories`)
- Orders by `created_at DESC`, takes the first row (most recent if multiple completions today)
- Maps result to a `UserAction`-shaped object using the same mapper as `getActiveActions`
- Returns `UserAction | null`

No schema changes required — `completions.created_at` is auto-populated by Supabase on insert.

## Home Screen Changes (`index.tsx`)

- Add `useGetTodayCompletedAction(user?.id)` query
- Add `const [showSuggestedFlow, setShowSuggestedFlow] = useState(false)` local state
- Loading spinner waits for all three queries: `isLoading || isProfileLoading || isTodayLoading`
- Render logic follows state machine above

## New Component: `CompletedAction`

**File:** `app/components/home/completed-action.tsx`

**Props:**
```ts
{
  action: UserAction;
  onDoAnother: () => void;
}
```

**Card visual** (reuses extracted `ActionCard` from `active-actions.tsx`):
- Header row: **"Completed"** + `Check` icon from `lucide-react-native` (replaces "In Progress" + green dot)
- Category badge (top right): unchanged
- Title + first sentence of description: unchanged
- Bottom-left corner: absolutely positioned green badge — small `bg-green-500` circle with a `Check` icon overlay

**CTAs** (below card):
- Primary: `<Button color="green">Do another action</Button>` → calls `onDoAnother()`
  - `onDoAnother` sets `showSuggestedFlow = true` in home screen — immediately renders `SuggestedActions`, user will not see the completed card again this session
- Secondary: `<Button color="ghost" size="sm">View progress</Button>` → `router.push("/(tabs)/(progress)")`

**Animations:** Same staggered mount pattern as `active-actions.tsx` — heading at 0ms, card at 80ms, buttons at 160ms.

## Refactor: Extract `ActionCard`

`ActionCard` in `active-actions.tsx` is currently a private component. It needs to be exported so `completed-action.tsx` can reuse it with the completed visual variant.

Extract `ActionCard` and accept an optional `completed?: boolean` prop:
- `false` (default): shows "In Progress" + green dot header
- `true`: shows "Completed" + `Check` icon header, and renders the bottom-left badge

## Out of Scope

- No changes to the action detail screen or success flow
- No changes to `SuggestedActions` or `ActiveActions` behaviour
- No persistence of `showSuggestedFlow` across sessions (intentional — resets on app restart)
