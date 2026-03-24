# Reminder Extensions — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Goal

Extend the existing reminder system with two capabilities:
1. Per-user configurable morning and evening reminder times (with individual toggles)
2. Action-specific "remind me" via a bottom sheet on the home screen

## Current State

- `user_profiles.notifications_enabled` — master switch for all reminders
- Two hardcoded pg_cron jobs: 10am UTC (morning) and 7pm UTC (evening)
- Two edge functions: `reminder-morning`, `reminder-evening`
- `user_actions.reminder_at TIMESTAMPTZ` — exists but unused
- Settings UI: single "Daily reminders" toggle behind `env.flags.useReminders`

---

## Section 1: Database

New columns and the `get_due_reminders()` RPC go into `supabase/migrations/20231128000000_init.sql`. The existing cron jobs live in `supabase/migrations/20251209000000_cron_reminders.sql` — the old jobs must be removed from that file and the new 5-minute job added there. No additional migration files.

### user_profiles — 4 new columns

```sql
morning_reminder_enabled  BOOLEAN  DEFAULT TRUE
evening_reminder_enabled  BOOLEAN  DEFAULT TRUE
morning_reminder_time     TIME     DEFAULT '10:00'  -- UTC
evening_reminder_time     TIME     DEFAULT '19:00'  -- UTC
```

`notifications_enabled` remains the master switch. Per-type toggles only apply when it is true.

### user_actions

No changes. `reminder_at TIMESTAMPTZ` is already present and will be used as-is.

### Cron — replace both existing jobs

Remove the hardcoded 10am and 7pm jobs. Add one job:

```sql
SELECT cron.schedule('reminder-dispatch', '*/5 * * * *', $$
  SELECT net.http_post(url := '<supabase-url>/functions/v1/reminder-dispatch', ...)
$$);
```

### New RPC: `get_due_reminders()`

Called by the edge function. Returns a single result set with a `reminder_type` discriminator column. Each row has: `user_id`, `onesignal_player_id`, `reminder_type` (`'morning' | 'evening' | 'action'`), `has_outstanding_actions` (boolean), `outstanding_count` (integer), `action_id` (nullable, only for `'action'` rows), `action_title` (nullable, only for `'action'` rows), `user_action_id` (nullable, only for `'action'` rows).

Row inclusion rules:
1. `reminder_type = 'morning'` — `notifications_enabled = true`, `morning_reminder_enabled = true`, current UTC time within ±2.5 minutes of `morning_reminder_time`
2. `reminder_type = 'evening'` — same logic with evening columns, **only for users with at least one outstanding action for the day** (matching current behaviour — this asymmetry is intentional: evening reminders are a nudge to complete outstanding actions, not a general check-in)
3. `reminder_type = 'action'` — `notifications_enabled = true`, `reminder_at` is within the current 5-minute window (`NOW()` to `NOW() + interval '5 minutes'`). `action_title` is sourced from `actions.title` via the join `user_actions.action_id → actions.id`.

No new tables. No RLS changes — existing `user_profiles` and `user_actions` RLS already covers the new columns and `reminder_at`.

---

## Section 2: Edge Functions

### Remove
- `supabase/functions/reminder-morning/index.ts`
- `supabase/functions/reminder-evening/index.ts`

### Add
- `supabase/functions/reminder-dispatch/index.ts`

### reminder-dispatch behaviour

Called every 5 minutes by the cron job:

1. Calls `get_due_reminders()` RPC
2. For each morning-due user: sends morning notification (same message logic as former `reminder-morning`)
3. For each evening-due user: sends evening notification (same message logic as former `reminder-evening`)
4. For each action-due row: sends a targeted notification referencing the action title, then sets `user_actions.reminder_at = null` (one-shot)

Notification payloads preserve the existing shape: `type`, `has_outstanding_actions`, `outstanding_count`. No changes needed on the app's notification handler.

The function is duplicate-resistant under normal operation — the ±2.5-minute window ensures a given user matches at most once per cron tick. It is not fully idempotent: a manual retry or parallel invocation within the same window would send duplicates for morning/evening, and the same risk applies to action reminders (since `reminder_at` is cleared at the end of the function, a retry before the clear completes could send a duplicate). This is acceptable for the current scale; add `morning_last_notified_at` / `evening_last_notified_at` watermarks to `user_profiles` and check `reminder_sent_at` on `user_actions` if stricter deduplication is needed later.

---

## Section 3: Types & API Hooks

### app/lib/api.ts — UserProfile type extension

`UserProfile` is defined in `app/lib/api.ts` (not a separate `types.ts`). Extend it with 4 new fields in camelCase, consistent with the existing convention (`userId`, `hasCompletedOnboarding`, etc.). Map from DB snake_case to camelCase in the existing `getUserProfile()` query function:

```typescript
morningReminderEnabled: boolean
eveningReminderEnabled: boolean
morningReminderTime: string   // 'HH:MM' UTC
eveningReminderTime: string   // 'HH:MM' UTC
```

No separate `ReminderConfig` interface. Use `Pick<UserProfile, ...>` at call sites.

### app/lib/api.ts — 4 new hooks

Add a `reminderConfig` entry to the existing `queryKeys` factory (e.g. `queryKeys.reminderConfig(userId)`) rather than using inline array literals, consistent with the existing pattern.

| Hook | Purpose | Invalidates |
|------|---------|-------------|
| `useGetReminderConfig(userId?)` | Select 4 reminder columns from `user_profiles` | — |
| `useUpdateReminderConfig()` | Update those columns | `queryKeys.reminderConfig(userId)` |
| `useSetActionReminder()` | Set `user_actions.reminder_at` | `queryKeys.userActions(userId)` |
| `useClearActionReminder()` | Set `user_actions.reminder_at = null` | `queryKeys.userActions(userId)` |

`useGetActionReminders` is not needed — `reminder_at` is already returned by the existing `useGetUserActions` query.

---

## Section 4: Settings UI

**File:** `app/app/(tabs)/(settings)/index.tsx`

Extend the existing "Notifications" section (behind `env.flags.useReminders`).

Current: single "Daily reminders" toggle.

New: toggle remains as master switch. When enabled, two rows expand beneath:

```
[toggle] Daily reminders

  Morning   [toggle]   10:00 AM  [edit]
  Evening   [toggle]    7:00 PM  [edit]
```

- **Edit** opens a native time picker modal (`@react-native-community/datetimepicker`, mode `'time'`). On confirm, calls `useUpdateReminderConfig`. Requires installing `@react-native-community/datetimepicker`.
- Times display in the user's local timezone. Storage is always UTC. Use `date-fns-tz` for conversion (check if already installed; add if not).
- Per-type toggles update `morning_reminder_enabled` / `evening_reminder_enabled` via `useUpdateReminderConfig`.
- Per-type rows are only visible when `notifications_enabled` is true.

---

## Section 5: Action Reminder Bottom Sheet

### New file: `app/components/reminders/action-reminder-sheet.tsx`

Built with `react-native-reanimated` (already installed). Owns both sheet behaviour and reminder content — no separate generic bottom sheet component needed.

**Sheet content:**

Preset buttons:
- "Tonight" → today at user's `evening_reminder_time` (local). **Disabled/hidden if the current local time is at or past `evening_reminder_time`** — setting a past time would cause the notification to silently never fire.
- "Tomorrow morning" → tomorrow at `morning_reminder_time` (local)
- "Tomorrow evening" → tomorrow at `evening_reminder_time` (local)

Custom button:
- Opens `DateTimePicker` (mode `'datetime'`). On confirm, sets `reminder_at` to chosen value.

On any selection: calls `useSetActionReminder`, shows brief confirmation text, closes sheet.

### Modified file: `app/components/home/active-actions.tsx`

- Add "Remind me" text button to each action card
- If `reminder_at` is already set, label shows the formatted time (e.g. "Tonight, 7 PM")
- Tapping either state opens the sheet, passing `userActionId`
- Sheet includes a "Clear reminder" option when `reminder_at` is set (calls `useClearActionReminder`)

---

## Implementation Order

1. DB — add columns and `get_due_reminders()` RPC to `init.sql`, update cron
2. Types — extend `UserProfile` in `api.ts`
3. API hooks — add 4 hooks to `api.ts`
4. Edge function — create `reminder-dispatch`, remove old functions
5. Settings UI — extend settings screen with per-type toggles and time pickers
6. Bottom sheet — create `action-reminder-sheet.tsx`
7. Home screen CTA — add "Remind me" button to `active-actions.tsx`

---

## Key Constraints

- Schema changes go in `init.sql`, not new migration files
- All times stored as UTC, displayed in local timezone via `date-fns-tz`
- `reminder_at` is one-shot — cleared after the notification fires
- `notifications_enabled` remains the master switch; per-type toggles are subordinate
- No new tables
- No new RLS policies required
