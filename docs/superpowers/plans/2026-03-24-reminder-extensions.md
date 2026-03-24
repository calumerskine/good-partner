# Reminder Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the reminder system with per-user configurable morning/evening times and per-action "remind me" via a bottom sheet.

**Architecture:** Add 4 columns to `user_profiles` and a `get_due_reminders()` RPC in `init.sql`. Replace two hardcoded edge functions with a single `reminder-dispatch` function called by a 5-minute cron. Add 4 React Query hooks, a bottom sheet component, and extend the settings and home screens.

**Tech Stack:** React Native (Expo), Supabase (PostgreSQL, pg_cron, Edge Functions), OneSignal, expo-router, React Query, `react-native-reanimated`, `date-fns`, `date-fns-tz`, `@react-native-community/datetimepicker`

**Spec:** `docs/superpowers/specs/2026-03-24-reminder-extensions-design.md`

---

## File Map

| Action | File |
|--------|------|
| Modify | `supabase/migrations/20231128000000_init.sql` |
| Modify | `supabase/migrations/20251209000000_cron_reminders.sql` |
| Create | `supabase/functions/reminder-dispatch/index.ts` |
| Delete | `supabase/functions/reminder-morning/index.ts` |
| Delete | `supabase/functions/reminder-evening/index.ts` |
| Modify | `app/lib/api.ts` (UserProfile type, queryKeys, 4 new hooks, getActiveActions) |
| Modify | `app/app/(tabs)/(settings)/index.tsx` |
| Create | `app/components/reminders/action-reminder-sheet.tsx` |
| Modify | `app/components/home/active-actions.tsx` |

---

## Task 1: Add reminder columns to user_profiles in init.sql

**Files:**
- Modify: `supabase/migrations/20231128000000_init.sql`

The `user_profiles` CREATE TABLE statement currently ends at line 22. Add 4 columns to it.

- [ ] **Step 1: Add columns to CREATE TABLE user_profiles**

In `init.sql`, find the `user_profiles` table definition and add the 4 new columns before the closing `);`:

```sql
  morning_reminder_enabled BOOLEAN DEFAULT TRUE,
  evening_reminder_enabled BOOLEAN DEFAULT TRUE,
  morning_reminder_time TIME DEFAULT '10:00',
  evening_reminder_time TIME DEFAULT '19:00'
```

The table should now look like:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  current_streak_days INTEGER DEFAULT 0,
  last_completion_date DATE,
  total_days_active INTEGER DEFAULT 0,
  morning_reminder_enabled BOOLEAN DEFAULT TRUE,
  evening_reminder_enabled BOOLEAN DEFAULT TRUE,
  morning_reminder_time TIME DEFAULT '10:00',
  evening_reminder_time TIME DEFAULT '19:00'
);
```

- [ ] **Step 2: Add get_due_reminders() RPC to init.sql**

Add this function at the end of `init.sql`, after the `total_xp` column addition (which is at the bottom near the XP migration content):

```sql
-- ============================================================================
-- REMINDER DISPATCH: Single RPC for all due reminders
-- ============================================================================

CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE (
  user_id UUID,
  reminder_type TEXT,
  has_outstanding_actions BOOLEAN,
  outstanding_count BIGINT,
  action_id UUID,
  action_title TEXT,
  user_action_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH
  user_action_status AS (
    SELECT
      ua.user_id,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM completions c
          WHERE c.user_action_id = ua.id
          AND c.completed_at::DATE = CURRENT_DATE
        )
      ) AS outstanding_count
    FROM user_actions ua
    WHERE ua.is_active = true
    GROUP BY ua.user_id
  ),
  eligible_users AS (
    SELECT
      up.user_id,
      up.morning_reminder_enabled,
      up.evening_reminder_enabled,
      up.morning_reminder_time,
      up.evening_reminder_time,
      COALESCE(uas.outstanding_count, 0) AS outstanding_count,
      COALESCE(uas.outstanding_count, 0) > 0 AS has_outstanding
    FROM user_profiles up
    LEFT JOIN user_action_status uas ON uas.user_id = up.user_id
    WHERE
      up.notifications_enabled = true
      AND up.has_completed_onboarding = true
  )
  -- Morning reminders: all eligible users whose morning_reminder_time is now (±2m30s)
  SELECT
    eu.user_id,
    'morning'::TEXT,
    eu.has_outstanding,
    eu.outstanding_count,
    NULL::UUID,
    NULL::TEXT,
    NULL::UUID
  FROM eligible_users eu
  WHERE
    eu.morning_reminder_enabled = true
    AND eu.morning_reminder_time BETWEEN
      ((NOW() AT TIME ZONE 'UTC')::TIME - INTERVAL '2 minutes 30 seconds')
      AND ((NOW() AT TIME ZONE 'UTC')::TIME + INTERVAL '2 minutes 30 seconds')

  UNION ALL

  -- Evening reminders: only users WITH outstanding actions, at their evening time
  SELECT
    eu.user_id,
    'evening'::TEXT,
    TRUE::BOOLEAN,
    eu.outstanding_count,
    NULL::UUID,
    NULL::TEXT,
    NULL::UUID
  FROM eligible_users eu
  WHERE
    eu.evening_reminder_enabled = true
    AND eu.has_outstanding = true
    AND eu.evening_reminder_time BETWEEN
      ((NOW() AT TIME ZONE 'UTC')::TIME - INTERVAL '2 minutes 30 seconds')
      AND ((NOW() AT TIME ZONE 'UTC')::TIME + INTERVAL '2 minutes 30 seconds')

  UNION ALL

  -- Action-specific one-shot reminders
  SELECT
    ua.user_id,
    'action'::TEXT,
    FALSE::BOOLEAN,
    0::BIGINT,
    ua.action_id,
    a.title,
    ua.id
  FROM user_actions ua
  JOIN actions a ON a.id = ua.action_id
  JOIN user_profiles up ON up.user_id = ua.user_id
  WHERE
    up.notifications_enabled = true
    AND ua.reminder_at >= NOW()
    AND ua.reminder_at < NOW() + INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_due_reminders() TO service_role;
```

- [ ] **Step 3: Verify SQL is valid**

Run: `cd /Users/calumerskine/dev/apps/good-partner && supabase db reset --local`

Expected: Reset completes without SQL errors. If you don't have a local Supabase running, at minimum open `init.sql` and confirm no syntax errors visually (matching parentheses, no missing semicolons).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20231128000000_init.sql
git commit -m "feat(db): add per-user reminder config columns and get_due_reminders RPC"
```

---

## Task 2: Update cron_reminders.sql to use 5-minute dispatch

**Files:**
- Modify: `supabase/migrations/20251209000000_cron_reminders.sql`

The current file schedules two separate jobs (`morning-reminder` at 10am, `evening-reminder` at 7pm) calling `reminder-morning` and `reminder-evening`. Replace both with a single 5-minute job calling `reminder-dispatch`.

- [ ] **Step 1: Replace the two schedule calls**

Remove lines 94–112 (the two comments, both `SELECT schedule_reminder_job(...)` blocks, and the blank lines between them) and replace with:

```sql
-- Schedule reminder dispatch (every 5 minutes) - calls reminder-dispatch edge function
SELECT schedule_reminder_job(
  'reminder-dispatch',
  '*/5 * * * *',
  'reminder-dispatch'
);
```

The `get_reminder_users` function and `schedule_reminder_job` helper at the top of the file can remain — they are harmless once the old edge functions are deleted.

- [ ] **Step 2: Verify file looks correct**

The bottom of `20251209000000_cron_reminders.sql` should now end with:

```sql
SELECT schedule_reminder_job(
  'reminder-dispatch',
  '*/5 * * * *',
  'reminder-dispatch'
);

DROP FUNCTION schedule_reminder_job(TEXT, TEXT, TEXT);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20251209000000_cron_reminders.sql
git commit -m "feat(db): replace hardcoded reminder crons with single 5-minute dispatch"
```

---

## Task 3: Create reminder-dispatch edge function

**Files:**
- Create: `supabase/functions/reminder-dispatch/index.ts`

This replaces both `reminder-morning` and `reminder-evening`. It calls `get_due_reminders()`, fans out notifications by type, and clears `reminder_at` for one-shot action reminders.

> **OneSignal routing:** The existing edge functions use `include_external_user_ids: [user.user_id]` — the Supabase `user_id` UUID is the OneSignal external user ID (set during `oneSignalService.initialise(userId)` in the app). There is no separate `onesignal_player_id` column; the spec mention of it was vestigial. The plan routes the same way.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p /Users/calumerskine/dev/apps/good-partner/supabase/functions/reminder-dispatch
```

- [ ] **Step 2: Write the edge function**

Create `supabase/functions/reminder-dispatch/index.ts`:

```typescript
// Reminder dispatch — called every 5 minutes by pg_cron
// Handles morning, evening, and action-specific reminders in one pass
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

interface DueReminder {
  user_id: string
  reminder_type: 'morning' | 'evening' | 'action'
  has_outstanding_actions: boolean
  outstanding_count: number
  action_id: string | null
  action_title: string | null
  user_action_id: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID')!
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: reminders, error } = await supabase.rpc('get_due_reminders')
    if (error) {
      console.error('Error fetching due reminders:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders due', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Processing ${reminders.length} due reminders`)

    const sendNotification = async (
      userId: string,
      heading: string,
      message: string,
      data: Record<string, unknown>,
    ) => {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${oneSignalApiKey}`,
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          include_external_user_ids: [userId],
          contents: { en: message },
          headings: { en: heading },
          data,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(result))
      return result
    }

    const results = await Promise.all(
      (reminders as DueReminder[]).map(async (reminder) => {
        try {
          if (reminder.reminder_type === 'morning') {
            const heading = reminder.has_outstanding_actions
              ? 'Complete Your Actions'
              : 'Choose an Action'
            const message = reminder.has_outstanding_actions
              ? `You have ${reminder.outstanding_count} action${reminder.outstanding_count > 1 ? 's' : ''} to complete today. Keep up the great work!`
              : 'Time to strengthen your relationship! Choose your action for today.'
            await sendNotification(reminder.user_id, heading, message, {
              type: reminder.has_outstanding_actions ? 'complete_actions' : 'choose_action',
              has_outstanding_actions: reminder.has_outstanding_actions,
              outstanding_count: reminder.outstanding_count,
            })

          } else if (reminder.reminder_type === 'evening') {
            const count = reminder.outstanding_count
            await sendNotification(
              reminder.user_id,
              'Evening Check-In',
              `You still have ${count} action${count > 1 ? 's' : ''} to complete. You've got this!`,
              {
                type: 'evening_reminder',
                has_outstanding_actions: true,
                outstanding_count: count,
              },
            )

          } else if (reminder.reminder_type === 'action') {
            await sendNotification(
              reminder.user_id,
              'Reminder',
              `Time for: ${reminder.action_title}`,
              {
                type: 'action_reminder',
                has_outstanding_actions: false,
                outstanding_count: 0,
              },
            )
            // Clear the one-shot reminder after sending
            const { error: clearError } = await supabase
              .from('user_actions')
              .update({ reminder_at: null })
              .eq('id', reminder.user_action_id)
            if (clearError) {
              console.error(`Failed to clear reminder_at for ${reminder.user_action_id}:`, clearError)
            }
          }

          return { user_id: reminder.user_id, type: reminder.reminder_type, success: true }
        } catch (err) {
          console.error(`Error processing reminder for user ${reminder.user_id}:`, err)
          return { user_id: reminder.user_id, type: reminder.reminder_type, success: false, error: String(err) }
        }
      }),
    )

    const successCount = results.filter((r) => r.success).length
    return new Response(
      JSON.stringify({
        message: 'Reminders processed',
        total: reminders.length,
        success_count: successCount,
        failure_count: reminders.length - successCount,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
```

- [ ] **Step 3: Delete old edge functions**

```bash
rm -rf /Users/calumerskine/dev/apps/good-partner/supabase/functions/reminder-morning
rm -rf /Users/calumerskine/dev/apps/good-partner/supabase/functions/reminder-evening
```

- [ ] **Step 4: Verify the new function exists and old ones are gone**

```bash
ls /Users/calumerskine/dev/apps/good-partner/supabase/functions/
```

Expected: `reminder-dispatch` present, `reminder-morning` and `reminder-evening` absent.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/reminder-dispatch/
git rm -r supabase/functions/reminder-morning/ supabase/functions/reminder-evening/
git commit -m "feat(functions): replace morning/evening functions with unified reminder-dispatch"
```

---

## Task 4: Extend UserProfile type and queryKeys in api.ts

**Files:**
- Modify: `app/lib/api.ts`

`UserProfile` is defined at line 1165. `queryKeys` is defined at lines 6–24. `getUserProfile` is at line 1212. `getActiveActions` is at line 632. `UserAction` type is at line 588.

- [ ] **Step 1: Add reminderConfig and userActions to queryKeys factory**

The current `queryKeys` object ends at line 24. Add two new entries:

```typescript
// In the queryKeys object, add after `suggestedActions`:
reminderConfig: (userId: string) => ["reminderConfig", userId] as const,
```

- [ ] **Step 2: Add reminder fields to UserProfile type**

Find `export type UserProfile = {` at line 1165. Add 4 fields after `totalDaysActive`:

```typescript
export type UserProfile = {
  id: string;
  userId: string;
  userTier: "free";
  categories: Category[];
  createdAt: Date;
  hasCompletedOnboarding: boolean;
  totalXp: number;
  currentStreakDays: number;
  totalDaysActive: number;
  morningReminderEnabled: boolean;
  eveningReminderEnabled: boolean;
  morningReminderTime: string; // 'HH:MM' UTC
  eveningReminderTime: string; // 'HH:MM' UTC
};
```

- [ ] **Step 3: Add new columns to getUserProfile select and return**

In `getUserProfile` at line 1216, extend the select string:

```typescript
.select("id, user_id, user_tier, created_at, has_completed_onboarding, total_xp, current_streak_days, total_days_active, morning_reminder_enabled, evening_reminder_enabled, morning_reminder_time, evening_reminder_time")
```

And add the 4 fields to the return object at line 1250:

```typescript
return {
  id: profile.id,
  userId: profile.user_id,
  categories: categories,
  userTier: profile.user_tier,
  createdAt: new Date(profile.created_at),
  hasCompletedOnboarding: profile.has_completed_onboarding,
  totalXp: profile.total_xp ?? 0,
  currentStreakDays: profile.current_streak_days ?? 0,
  totalDaysActive: profile.total_days_active ?? 0,
  morningReminderEnabled: profile.morning_reminder_enabled ?? true,
  eveningReminderEnabled: profile.evening_reminder_enabled ?? true,
  morningReminderTime: profile.morning_reminder_time ?? '10:00',
  eveningReminderTime: profile.evening_reminder_time ?? '19:00',
};
```

- [ ] **Step 4: Add reminder_at to UserActionResponse type**

The private `UserActionResponse` type at line 604 is the raw DB response shape. Add `reminder_at` to it so the mapping in Step 5 compiles:

```typescript
type UserActionResponse = {
  id: string;
  action_id: string;
  user_id: string;
  activated_at: string;
  is_active: boolean;
  reminder_at: string | null;
  actions: {
    id: string;
    category: string;
    title: string;
    description: string | null;
    reasoning: string | null;
  } | null;
};
```

- [ ] **Step 5: Add reminderAt to UserAction type**

Find `export type UserAction = {` at line 588. Add `reminderAt` field:

```typescript
export type UserAction = {
  id: string;
  actionId: string;
  userId: string;
  activatedAt: Date;
  isActive: boolean;
  completionCount: number;
  reminderAt: Date | null;
  action: {
    id: string;
    category: string;
    title: string;
    description: string | null;
    reasoning: string | null;
  };
};
```

- [ ] **Step 6: Add reminder_at to getActiveActions query and mapping**

In `getActiveActions` at line 636, add `reminder_at` to the select:

```typescript
.select(
  `
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
`,
)
```

In the mapping at line 691, add `reminderAt`:

```typescript
.map((ua: any) => ({
  id: ua.id,
  actionId: ua.action_id,
  userId: ua.user_id,
  activatedAt: new Date(ua.activated_at),
  isActive: ua.is_active,
  completionCount: countMap.get(ua.id) || 0,
  reminderAt: ua.reminder_at ? new Date(ua.reminder_at) : null,
  action: {
    id: ua.actions.id,
    category: ua.actions.action_categories?.name || "",
    title: ua.actions.title,
    description: ua.actions.description,
    reasoning: ua.actions.reasoning,
  },
}));
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && npx tsc --noEmit
```

Expected: No errors related to the changes. (Other pre-existing errors can be ignored.)

- [ ] **Step 8: Commit**

```bash
git add app/lib/api.ts
git commit -m "feat(types): extend UserProfile and UserAction with reminder fields"
```

---

## Task 5: Add reminder API hooks to api.ts

**Files:**
- Modify: `app/lib/api.ts`

Add 4 hooks after the `useGetNotificationsEnabled` block (around line 233). Each follows the same pattern as the existing notification hooks.

- [ ] **Step 1: Add useGetReminderConfig and useUpdateReminderConfig**

Add after line 233 (after `useGetNotificationsEnabled`):

```typescript
// ============================================================
// REMINDER CONFIGURATION
// ============================================================

export function useGetReminderConfig(userId?: string) {
  return useQuery({
    queryKey: queryKeys.reminderConfig(userId!),
    queryFn: () => getReminderConfig(userId!),
    enabled: !!userId,
  });
}

async function getReminderConfig(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "morning_reminder_enabled, evening_reminder_enabled, morning_reminder_time, evening_reminder_time",
    )
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return {
    morningReminderEnabled: data.morning_reminder_enabled ?? true,
    eveningReminderEnabled: data.evening_reminder_enabled ?? true,
    morningReminderTime: data.morning_reminder_time ?? "10:00",
    eveningReminderTime: data.evening_reminder_time ?? "19:00",
  };
}

export function useUpdateReminderConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      config,
    }: {
      userId: string;
      config: Partial<{
        morning_reminder_enabled: boolean;
        evening_reminder_enabled: boolean;
        morning_reminder_time: string;
        evening_reminder_time: string;
      }>;
    }) => {
      const { error } = await supabase
        .from("user_profiles")
        .update(config)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reminderConfig(userId),
      });
      // Also invalidate userProfile so settings screen reflects changes
      queryClient.invalidateQueries({
        queryKey: queryKeys.userProfile(userId),
      });
    },
  });
}
```

- [ ] **Step 2: Add useSetActionReminder and useClearActionReminder**

Add after the reminder config hooks:

```typescript
// ============================================================
// ACTION-SPECIFIC REMINDERS
// ============================================================

export function useSetActionReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userActionId,
      reminderAt,
    }: {
      userId: string;
      userActionId: string;
      reminderAt: string; // ISO timestamp
    }) => {
      const { error } = await supabase
        .from("user_actions")
        .update({ reminder_at: reminderAt })
        .eq("id", userActionId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeActions(userId),
      });
    },
  });
}

export function useClearActionReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userActionId,
    }: {
      userId: string;
      userActionId: string;
    }) => {
      const { error } = await supabase
        .from("user_actions")
        .update({ reminder_at: null })
        .eq("id", userActionId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.activeActions(userId),
      });
    },
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/api.ts
git commit -m "feat(api): add reminder config and action reminder hooks"
```

---

## Task 6: Install dependencies

**Files:**
- Modify: `app/package.json`

`date-fns` is already installed. `date-fns-tz` and `@react-native-community/datetimepicker` are not.

- [ ] **Step 1: Install packages**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && pnpm add date-fns-tz @react-native-community/datetimepicker
```

- [ ] **Step 2: Verify installations**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && grep -E "date-fns-tz|datetimepicker" package.json
```

Expected: Both packages appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app
git add app/package.json app/pnpm-lock.yaml
git commit -m "chore: add date-fns-tz and datetimepicker dependencies"
```

---

## Task 7: Extend settings screen with per-type reminder controls

**Files:**
- Modify: `app/app/(tabs)/(settings)/index.tsx`

The current notifications section (lines 128–153) shows a single "Daily reminders" master toggle. We'll add per-type rows beneath it that expand when `notificationsEnabled` is true.

- [ ] **Step 1: Add imports**

Add to the existing import block at the top of the file:

```typescript
import DateTimePicker from "@react-native-community/datetimepicker";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { useGetReminderConfig, useUpdateReminderConfig } from "@/lib/api";
```

(Remove `useGetReminderConfig` and `useUpdateReminderConfig` from the existing `@/lib/api` import line and add them above, or just append them to the existing import.)

- [ ] **Step 2: Add state and hooks inside SettingsScreen**

Add after the existing `const { mutateAsync: toggleNotifications }` line:

```typescript
const { data: reminderConfig } = useGetReminderConfig(user?.id);
const { mutateAsync: updateReminderConfig } = useUpdateReminderConfig();
const [showMorningPicker, setShowMorningPicker] = useState(false);
const [showEveningPicker, setShowEveningPicker] = useState(false);
```

Add `useState` to the existing React import if not already there.

- [ ] **Step 3: Add helper functions**

Add before the `return (` statement:

```typescript
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Convert a 'HH:MM' UTC time string into a local Date (today)
const utcTimeStrToLocalDate = (utcTimeStr: string): Date => {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return toZonedTime(d, tz);
};

// Convert a local Date back to a 'HH:MM' UTC string
const localDateToUtcTimeStr = (date: Date): string => {
  const utc = fromZonedTime(date, tz);
  const h = utc.getUTCHours().toString().padStart(2, "0");
  const m = utc.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

const formatTimeForDisplay = (utcTimeStr: string): string =>
  format(utcTimeStrToLocalDate(utcTimeStr), "h:mm a");
```

- [ ] **Step 4: Replace the notifications section JSX**

Find the `{env.flags.useReminders && (` block (lines 128–153) and replace it entirely with:

```tsx
{env.flags.useReminders && (
  <View style={tw`mb-6`}>
    <Text style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}>
      Notifications
    </Text>
    <View style={tw`bg-white border-2 rounded-xl p-5`}>
      {/* Master toggle */}
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={tw`text-charcoal font-gabarito font-bold text-lg`}>
          Daily reminders
        </Text>
        <Switch
          value={notificationsEnabled ?? false}
          onValueChange={handleSetNotifications}
        />
      </View>
      <Text style={tw`font-gabarito text-sm text-charcoal/80 leading-relaxed`}>
        Get a gentle reminder to complete your daily action and stay on track.
      </Text>

      {/* Per-type rows — only show when master switch is on */}
      {notificationsEnabled && reminderConfig && (
        <View style={tw`mt-4 gap-3`}>
          {/* Morning row */}
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-2`}>
              <Switch
                value={reminderConfig.morningReminderEnabled}
                onValueChange={(val) =>
                  updateReminderConfig({
                    userId: user.id,
                    config: { morning_reminder_enabled: val },
                  })
                }
              />
              <Text style={tw`font-gabarito text-charcoal`}>Morning</Text>
            </View>
            <View style={tw`flex-row items-center gap-3`}>
              <Text style={tw`font-gabarito text-charcoal/70`}>
                {formatTimeForDisplay(reminderConfig.morningReminderTime)}
              </Text>
              <Button
                size="sm"
                color="ghost"
                onPress={() => setShowMorningPicker(true)}
              >
                Edit
              </Button>
            </View>
          </View>

          {/* Evening row */}
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-2`}>
              <Switch
                value={reminderConfig.eveningReminderEnabled}
                onValueChange={(val) =>
                  updateReminderConfig({
                    userId: user.id,
                    config: { evening_reminder_enabled: val },
                  })
                }
              />
              <Text style={tw`font-gabarito text-charcoal`}>Evening</Text>
            </View>
            <View style={tw`flex-row items-center gap-3`}>
              <Text style={tw`font-gabarito text-charcoal/70`}>
                {formatTimeForDisplay(reminderConfig.eveningReminderTime)}
              </Text>
              <Button
                size="sm"
                color="ghost"
                onPress={() => setShowEveningPicker(true)}
              >
                Edit
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>

    {/* Time pickers — rendered outside the card to avoid layout issues */}
    {/* Platform note: on iOS, DateTimePicker in mode="time" renders as an inline spinner.
        On Android it renders as a native dialog. Both are functional; the UX differs.
        Wrap in a <Modal> from react-native if a consistent modal experience is needed. */}
    {showMorningPicker && reminderConfig && (
      <DateTimePicker
        value={utcTimeStrToLocalDate(reminderConfig.morningReminderTime)}
        mode="time"
        onChange={(event, date) => {
          setShowMorningPicker(false);
          if (event.type === "set" && date) {
            updateReminderConfig({
              userId: user.id,
              config: { morning_reminder_time: localDateToUtcTimeStr(date) },
            });
          }
        }}
      />
    )}
    {showEveningPicker && reminderConfig && (
      <DateTimePicker
        value={utcTimeStrToLocalDate(reminderConfig.eveningReminderTime)}
        mode="time"
        onChange={(event, date) => {
          setShowEveningPicker(false);
          if (event.type === "set" && date) {
            updateReminderConfig({
              userId: user.id,
              config: { evening_reminder_time: localDateToUtcTimeStr(date) },
            });
          }
        }}
      />
    )}
  </View>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && npx tsc --noEmit
```

- [ ] **Step 6: Manual verification**

Run the app (`npx expo start`), navigate to Settings, enable Daily reminders. Confirm:
- Morning and Evening rows appear beneath the master toggle
- Each has its own toggle and time display
- Tapping Edit opens the native time picker
- Saving a new time updates the displayed value

- [ ] **Step 7: Commit**

```bash
git add app/app/\(tabs\)/\(settings\)/index.tsx
git commit -m "feat(settings): add per-type morning/evening reminder toggles and time pickers"
```

---

## Task 8: Create action-reminder-sheet component

**Files:**
- Create: `app/components/reminders/action-reminder-sheet.tsx`

This is a bottom sheet built with `react-native-reanimated`. It accepts a `userActionId`, the current `reminderAt` value (so it can show a Clear option), and an `onClose` callback. It shows preset time options and a custom picker.

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/calumerskine/dev/apps/good-partner/app/components/reminders
```

- [ ] **Step 2: Write the component**

Create `app/components/reminders/action-reminder-sheet.tsx`:

```typescript
import { useAuth } from "@/hooks/use-auth";
import {
  useClearActionReminder,
  useGetReminderConfig,
  useSetActionReminder,
} from "@/lib/api";
import tw from "@/lib/tw";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, format, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface ActionReminderSheetProps {
  userActionId: string;
  currentReminderAt: Date | null;
  onClose: () => void;
}

// Convert a 'HH:MM' UTC time string to a local Date on a given day offset.
// Sets UTC hours directly on a Date to avoid double-offset bug.
function utcTimeToLocalDate(utcTimeStr: string, dayOffset = 0): Date {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const d = addDays(new Date(), dayOffset);
  d.setUTCHours(hours, minutes, 0, 0);
  return toZonedTime(d, tz);
}

export default function ActionReminderSheet({
  userActionId,
  currentReminderAt,
  onClose,
}: ActionReminderSheetProps) {
  const { user } = useAuth();
  const { data: reminderConfig } = useGetReminderConfig(user?.id);
  const { mutateAsync: setReminder } = useSetActionReminder();
  const { mutateAsync: clearReminder } = useClearActionReminder();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const translateY = useSharedValue(500);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300 });
    overlayOpacity.value = withTiming(1, { duration: 250 });
  }, []);

  const dismiss = () => {
    translateY.value = withTiming(500, { duration: 280 });
    overlayOpacity.value = withTiming(0, { duration: 220 }, () =>
      runOnJS(onClose)(),
    );
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value * 0.45,
  }));

  const handleSelect = async (reminderAt: Date) => {
    if (!user) return;
    await setReminder({
      userId: user.id,
      userActionId,
      reminderAt: reminderAt.toISOString(),
    });
    setConfirmation(`Reminder set for ${format(reminderAt, "EEE, h:mm a")}`);
    setTimeout(() => dismiss(), 1400);
  };

  const handleClear = async () => {
    if (!user) return;
    await clearReminder({ userId: user.id, userActionId });
    dismiss();
  };

  // Compute preset dates from the user's configured times
  const tonightDate = reminderConfig
    ? utcTimeToLocalDate(reminderConfig.eveningReminderTime, 0)
    : null;
  const tomorrowMorningDate = reminderConfig
    ? utcTimeToLocalDate(reminderConfig.morningReminderTime, 1)
    : null;
  const tomorrowEveningDate = reminderConfig
    ? utcTimeToLocalDate(reminderConfig.eveningReminderTime, 1)
    : null;

  // "Tonight" is only valid if we haven't passed the evening time yet
  const isTonightAvailable =
    tonightDate !== null && isBefore(new Date(), tonightDate);

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={[tw`absolute inset-0 bg-black`, overlayStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={tw`flex-1`} onPress={dismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-12`,
          sheetStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={tw`w-10 h-1 bg-charcoal/20 rounded-full self-center mb-5`} />

        <Text style={tw`text-xl font-gabarito font-bold text-charcoal mb-4`}>
          Set a reminder
        </Text>

        {confirmation ? (
          <View style={tw`py-8 items-center`}>
            <Text style={tw`font-gabarito text-charcoal text-base`}>
              {confirmation}
            </Text>
          </View>
        ) : (
          <>
            <View style={tw`gap-3 mb-3`}>
              {isTonightAvailable && tonightDate && (
                <Pressable
                  style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tonightDate)}
                >
                  <Text style={tw`font-gabarito font-bold text-charcoal`}>
                    Tonight
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                    {format(tonightDate, "h:mm a")}
                  </Text>
                </Pressable>
              )}

              {tomorrowMorningDate && (
                <Pressable
                  style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tomorrowMorningDate)}
                >
                  <Text style={tw`font-gabarito font-bold text-charcoal`}>
                    Tomorrow morning
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                    {format(tomorrowMorningDate, "EEE, h:mm a")}
                  </Text>
                </Pressable>
              )}

              {tomorrowEveningDate && (
                <Pressable
                  style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tomorrowEveningDate)}
                >
                  <Text style={tw`font-gabarito font-bold text-charcoal`}>
                    Tomorrow evening
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                    {format(tomorrowEveningDate, "EEE, h:mm a")}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                onPress={() => setShowCustomPicker(true)}
              >
                <Text style={tw`font-gabarito font-bold text-charcoal`}>
                  Custom time
                </Text>
                <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                  Pick a date and time
                </Text>
              </Pressable>
            </View>

            {currentReminderAt && (
              <Pressable onPress={handleClear} style={tw`py-3 items-center`}>
                <Text style={tw`font-gabarito text-sm text-red-500`}>
                  Clear reminder
                </Text>
              </Pressable>
            )}

            {showCustomPicker && (
              <DateTimePicker
                value={new Date()}
                mode="datetime"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowCustomPicker(false);
                  if (event.type === "set" && date) {
                    handleSelect(date);
                  }
                }}
              />
            )}
          </>
        )}
      </Animated.View>
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/components/reminders/action-reminder-sheet.tsx
git commit -m "feat(ui): add action reminder bottom sheet component"
```

---

## Task 9: Add "Remind me" CTA to active-actions.tsx

**Files:**
- Modify: `app/components/home/active-actions.tsx`

Add a "Remind me" button to each `ActionCard`. When tapped, it mounts `ActionReminderSheet` over the screen using a state flag. If `reminderAt` is already set, the button label shows the formatted time.

- [ ] **Step 1: Add imports**

Add to the top of `active-actions.tsx`:

```typescript
import ActionReminderSheet from "@/components/reminders/action-reminder-sheet";
import { format, isBefore, isToday, isTomorrow } from "date-fns";
import { env } from "@/lib/env";
```

- [ ] **Step 2: Lift sheet state to ActiveActions**

The sheet must render outside the `ScrollView` to overlay the full screen correctly. Lift state to the `ActiveActions` parent component (not `ActionCard`).

In `ActiveActions`, add alongside the existing `expandedId` state:

```typescript
const [reminderSheetActionId, setReminderSheetActionId] = useState<string | null>(null);
```

Find the item for the sheet when needed:
```typescript
const reminderSheetAction = userActions.find((a) => a.id === reminderSheetActionId) ?? null;
```

In the `ActiveActions` return, add `ActionReminderSheet` **after** the closing `</View>` of the `userActions.map(...)` block but **before** the outer `</View>`:

```tsx
{reminderSheetAction && (
  <ActionReminderSheet
    userActionId={reminderSheetAction.id}
    currentReminderAt={reminderSheetAction.reminderAt}
    onClose={() => setReminderSheetActionId(null)}
  />
)}
```

Pass `onRemind` down to `ActionCard`:

```typescript
// Add to ActionCard props interface:
onRemind: () => void;

// Pass from ActiveActions:
<ActionCard
  active
  key={item.id}
  item={item}
  isExpanded
  onToggle={() => handleToggle(item.id)}
  onRemind={() => setReminderSheetActionId(item.id)}
/>
```

- [ ] **Step 3: Add helper to format reminder label**

Add inside `ActionCard`, before the return:

```typescript
const formatReminderLabel = (reminderAt: Date): string => {
  if (isToday(reminderAt)) return `Today, ${format(reminderAt, "h:mm a")}`;
  if (isTomorrow(reminderAt)) return `Tomorrow, ${format(reminderAt, "h:mm a")}`;
  return format(reminderAt, "EEE, h:mm a");
};
```

- [ ] **Step 4: Add the Remind me button to ActionCard's expanded content**

In the expanded content section (inside the `{isExpanded && (` block), add after the existing `<View style={tw\`gap-2\`}>` buttons:

```tsx
{env.flags.useReminders && (
  <Button
    color="ghost"
    size="sm"
    onPress={onRemind}
  >
    {item.reminderAt && isBefore(new Date(), item.reminderAt)
      ? formatReminderLabel(item.reminderAt)
      : "Remind me"}
  </Button>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/calumerskine/dev/apps/good-partner/app && npx tsc --noEmit
```

- [ ] **Step 6: Manual verification**

Run the app (`npx expo start`), navigate to Home with active actions. Confirm:
- "Remind me" button appears on each expanded action card (when `EXPO_PUBLIC_REMINDERS=true`)
- Tapping it opens the bottom sheet with preset options
- Selecting a preset sets the reminder and shows confirmation
- The button label updates to the formatted time after setting
- Tapping the label reopens the sheet; "Clear reminder" removes it
- The "Tonight" option is hidden after the evening reminder time has passed

- [ ] **Step 7: Commit**

```bash
git add app/components/home/active-actions.tsx
git commit -m "feat(home): add remind me button and action reminder sheet to action cards"
```

---

## Deployment Checklist

Before merging to master:

- [ ] Push `reminder-dispatch` edge function to Supabase:
  ```bash
  cd /Users/calumerskine/dev/apps/good-partner && supabase functions deploy reminder-dispatch
  ```
- [ ] Delete the old edge functions from the remote Supabase project:
  ```bash
  supabase functions delete reminder-morning
  supabase functions delete reminder-evening
  ```
- [ ] Reset local DB (or run `supabase db push` for remote) to apply new columns and RPC. No backfill needed — new `user_profiles` columns have defaults; existing rows will use `10:00`/`19:00` until a user changes their settings.
- [ ] Confirm old cron jobs (`morning-reminder`, `evening-reminder`) are removed from `cron.job` table
- [ ] Confirm new `reminder-dispatch` cron job appears in `cron.job`
- [ ] Test `get_due_reminders()` manually from Supabase SQL editor:
  ```sql
  -- Temporarily set your user's morning_reminder_time to current UTC time ±2 min
  UPDATE user_profiles SET morning_reminder_time = (NOW() AT TIME ZONE 'UTC')::TIME WHERE user_id = '<your-user-id>';
  SELECT * FROM get_due_reminders();
  ```
  Expected: Your user appears with `reminder_type = 'morning'`
- [ ] Invoke `reminder-dispatch` manually from Supabase dashboard and confirm notification received
