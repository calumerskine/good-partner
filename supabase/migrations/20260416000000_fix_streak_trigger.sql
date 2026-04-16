-- Recreate update_user_streak function and trigger to fix idempotency.
-- The original CREATE TRIGGER (without IF NOT EXISTS) would fail silently on re-runs,
-- leaving total_days_active never incrementing.

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
BEGIN
    -- 1. Get the last completion date and current streak from user_profiles
    -- We join through user_actions to find the correct profile
    SELECT last_completion_date, current_streak_days
    INTO last_date, current_streak
    FROM user_profiles
    JOIN user_actions ON user_actions.user_id = user_profiles.user_id
    WHERE user_actions.id = NEW.user_action_id;

    -- 2. Determine the new streak value
    IF last_date IS NULL THEN
        -- First time ever completing an action
        current_streak := 1;
    ELSIF last_date = CURRENT_DATE THEN
        -- Already completed something today, don't increment streak
        current_streak := current_streak;
    ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Completed yesterday, increment streak
        current_streak := current_streak + 1;
    ELSE
        -- Streak broken (last completion was > 1 day ago)
        current_streak := 1;
    END IF;

    -- 3. Update the profile
    UPDATE user_profiles
    SET
        current_streak_days = current_streak,
        last_completion_date = CURRENT_DATE,
        total_days_active = total_days_active + (CASE WHEN last_date = CURRENT_DATE THEN 0 ELSE 1 END)
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
