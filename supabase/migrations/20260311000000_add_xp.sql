-- Add XP tracking to user profiles
ALTER TABLE user_profiles ADD COLUMN total_xp INTEGER NOT NULL DEFAULT 0;

-- RPC function to atomically increment XP and return before/after values
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
