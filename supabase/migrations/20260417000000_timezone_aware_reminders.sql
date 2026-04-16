-- Add IANA timezone column to user_profiles.
-- Reminder times are now stored as local time in the user's timezone,
-- not UTC. The scheduler converts NOW() to the user's local time and
-- compares directly against the stored local time.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Reset all existing reminder times to the local defaults (10am / 7pm).
-- Previously times were stored as UTC offsets from the local default,
-- so existing stored values are no longer meaningful after this change.
UPDATE user_profiles
  SET morning_reminder_time = '9:00',
      evening_reminder_time = '19:00';

-- Replace get_due_reminders() with a timezone-aware version.
-- Instead of:  DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') + stored_time
-- We now use:  (NOW() AT TIME ZONE user.timezone)::time
-- This fires reminders at the correct local time for each user,
-- regardless of their timezone or DST offset.
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
      up.timezone,
      up.morning_reminder_enabled,
      up.evening_reminder_enabled,
      up.morning_reminder_time,
      up.evening_reminder_time,
      COALESCE(uas.outstanding_count, 0) AS outstanding_count,
      COALESCE(uas.outstanding_count, 0) > 0 AS has_outstanding
    FROM user_profiles up
    LEFT JOIN user_action_status uas ON uas.user_id = up.user_id
    WHERE
      up.has_completed_onboarding = true
  )
  -- Morning reminders: fire when the user's local time matches their stored morning time
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
    AND (NOW() AT TIME ZONE eu.timezone)::time
      BETWEEN eu.morning_reminder_time - INTERVAL '2 minutes 30 seconds'
          AND eu.morning_reminder_time + INTERVAL '2 minutes 30 seconds'

  UNION ALL

  -- Evening reminders: only for users with outstanding actions
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
    AND (NOW() AT TIME ZONE eu.timezone)::time
      BETWEEN eu.evening_reminder_time - INTERVAL '2 minutes 30 seconds'
          AND eu.evening_reminder_time + INTERVAL '2 minutes 30 seconds'

  UNION ALL

  -- Action-specific one-shot reminders (already timezone-correct via TIMESTAMPTZ)
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
    up.action_notifications_enabled = true
    AND ua.is_active = true
    AND ua.reminder_at BETWEEN
      (NOW() - INTERVAL '2 minutes 30 seconds')
      AND (NOW() + INTERVAL '2 minutes 30 seconds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_due_reminders() TO service_role;
