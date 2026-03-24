-- ============================================================================
-- ACTION REMINDER SYSTEM
-- 5-minute polling dispatch job that calls the reminder-dispatch edge function,
-- which determines which users are due for morning, evening, or action reminders.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- CORE FUNCTION: Get users for reminders
-- ============================================================================

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

-- Helper function to schedule reminder jobs
CREATE OR REPLACE FUNCTION schedule_reminder_job(
  job_name TEXT,
  schedule TEXT,
  function_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- Remove existing job if present
  PERFORM cron.unschedule(jobid) 
  FROM cron.job 
  WHERE jobname = job_name;

  -- Schedule new job
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

-- Schedule reminder dispatch (every 5 minutes) - calls reminder-dispatch edge function
SELECT schedule_reminder_job(
  'reminder-dispatch',
  '*/5 * * * *',
  'reminder-dispatch'
);
