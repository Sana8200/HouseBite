-- join_household(p_invite_id)
--
-- Called via supabase.rpc('join_household', { ... }) from the frontend.
-- Runs as SECURITY DEFINER (bypasses RLS) so it can:
--   1. Look up the household by invite_id
--   2. Check the caller isn't already a member
--   3. Insert the allocation linking the caller to that household
--   4. Return the joined household as JSON
CREATE OR REPLACE FUNCTION join_household(
  p_invite_id TEXT
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_household record;
  v_existing record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find household by invite_id
  SELECT id, house_name, invite_id, monthly_budget
  INTO v_household
  FROM household
  WHERE invite_id = lower(trim(p_invite_id));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No household found with that invite ID';
  END IF;

  -- Check if already a member
  SELECT member_id INTO v_existing
  FROM allocations
  WHERE member_id = v_user_id AND household_id = v_household.id;

  IF FOUND THEN
    RAISE EXCEPTION 'You are already a member of %', v_household.house_name;
  END IF;

  -- Link user to household
  INSERT INTO allocations (member_id, household_id)
  VALUES (v_user_id, v_household.id);

  RETURN json_build_object(
    'id', v_household.id,
    'house_name', v_household.house_name,
    'invite_id', v_household.invite_id,
    'monthly_budget', v_household.monthly_budget
  );
END;
$$;
