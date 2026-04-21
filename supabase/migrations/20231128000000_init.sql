-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE action_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  morning_reminder_enabled BOOLEAN DEFAULT FALSE,
  evening_reminder_enabled BOOLEAN DEFAULT FALSE,
  morning_reminder_time TIME DEFAULT '9:00',
  evening_reminder_time TIME DEFAULT '19:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  total_xp INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES action_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, category_id)
);

CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES action_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reminder_at TIMESTAMPTZ,
  last_dismissed_at TIMESTAMPTZ,
  skip_count INTEGER DEFAULT 0
);

CREATE TABLE user_skips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  skipped_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, action_id, skipped_at)
);

CREATE TABLE completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_action_id UUID NOT NULL REFERENCES user_actions(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  was_noticed TEXT DEFAULT NULL,
  felt TEXT CHECK (felt IN ('neutral', 'good', 'great'))
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE action_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER UNIQUE NOT NULL,
  headline_message TEXT NOT NULL,
  subtext TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_user_categories_profile_id ON user_categories(profile_id);
CREATE INDEX idx_user_categories_category_id ON user_categories(category_id);
CREATE INDEX idx_actions_category_id ON actions(category_id);
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_action_id ON user_actions(action_id);
CREATE INDEX idx_user_actions_active ON user_actions(user_id, is_active);
CREATE INDEX idx_completions_user_action ON completions(user_action_id);
CREATE INDEX idx_user_profiles_user_tier ON user_profiles(user_tier);
CREATE INDEX idx_user_actions_reminder_at ON user_actions(reminder_at) WHERE reminder_at IS NOT NULL;

-- ============================================================================
-- STREAK TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
    user_timezone TEXT;
    today DATE;
BEGIN
    SELECT last_completion_date, current_streak_days, up.timezone
    INTO last_date, current_streak, user_timezone
    FROM user_profiles up
    JOIN user_actions ua ON ua.user_id = up.user_id
    WHERE ua.id = NEW.user_action_id;

    today := (NOW() AT TIME ZONE COALESCE(user_timezone, 'UTC'))::DATE;

    IF last_date IS NULL THEN
        current_streak := 1;
    ELSIF last_date = today THEN
        current_streak := current_streak;
    ELSIF last_date = today - INTERVAL '1 day' THEN
        current_streak := current_streak + 1;
    ELSE
        current_streak := 1;
    END IF;

    UPDATE user_profiles
    SET
        current_streak_days = current_streak,
        last_completion_date = today,
        total_days_active = total_days_active + (CASE WHEN last_date = today THEN 0 ELSE 1 END)
    FROM user_actions
    WHERE user_profiles.user_id = user_actions.user_id
    AND user_actions.id = NEW.user_action_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_streak ON completions;

CREATE TRIGGER trigger_update_streak
AFTER INSERT ON completions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE VIEW user_daily_status AS
SELECT
  p.user_id,
  p.current_streak_days,
  (p.last_completion_date = CURRENT_DATE) AS is_completed_today
FROM user_profiles p;

-- ============================================================================
-- XP
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_xp(p_user_id UUID, p_amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_xp INTEGER;
  v_new_xp INTEGER;
BEGIN
  SELECT total_xp INTO v_previous_xp
  FROM user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive, got: %', p_amount;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', p_user_id;
  END IF;

  v_new_xp := v_previous_xp + p_amount;

  UPDATE user_profiles
  SET total_xp = v_new_xp
  WHERE user_id = p_user_id;

  RETURN json_build_object('previous_xp', v_previous_xp, 'new_xp', v_new_xp);
END;
$$;

-- ============================================================================
-- REMINDERS
-- ============================================================================

-- Timezone-aware RPC returning all users due for a reminder right now.
-- Reminder times are stored as local time in the user's timezone;
-- (NOW() AT TIME ZONE user.timezone)::time is compared directly against them.
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
    WHERE up.has_completed_onboarding = true
  )
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

-- Legacy function kept for backwards compatibility.
CREATE OR REPLACE FUNCTION get_reminder_users(only_with_outstanding BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  has_outstanding_actions BOOLEAN,
  outstanding_action_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_action_status AS (
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
  )
  SELECT
    up.id,
    up.user_id,
    COALESCE(uas.outstanding_count, 0) > 0,
    COALESCE(uas.outstanding_count, 0)
  FROM user_profiles up
  LEFT JOIN user_action_status uas ON uas.user_id = up.user_id
  WHERE
    up.notifications_enabled = true
    AND up.has_completed_onboarding = true
    AND (NOT only_with_outstanding OR COALESCE(uas.outstanding_count, 0) > 0)
  ORDER BY up.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_reminder_users(BOOLEAN) TO service_role;

-- ============================================================================
-- CRON JOBS
-- ============================================================================

CREATE OR REPLACE FUNCTION schedule_reminder_job(
  job_name TEXT,
  schedule TEXT,
  function_name TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = job_name;

  PERFORM cron.schedule(
    job_name,
    schedule,
    format(
      $sql$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/%s',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_key')
        ),
        body := '{}'::jsonb
      );
      $sql$,
      function_name
    )
  );
END;
$$ LANGUAGE plpgsql;

SELECT schedule_reminder_job(
  'reminder-dispatch',
  '*/5 * * * *',
  'reminder-dispatch'
);
