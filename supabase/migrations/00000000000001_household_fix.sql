-- Grant schema and table access to anon and authenticated roles.
-- Supabase cloud does this automatically; local dev needs it explicit.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Add missing invite_id column (HouseHold.tsx references it)
ALTER TABLE household
  ADD COLUMN invite_id TEXT DEFAULT substr(md5(random()::text), 1, 8);

-- Replace the FOR ALL policy on household (blocks INSERT because
-- the household can't be in my_households() before it exists).
DROP POLICY "members see own households" ON household;

CREATE POLICY "household_select" ON household
  FOR SELECT USING (id IN (SELECT my_households()));

CREATE POLICY "household_update" ON household
  FOR UPDATE USING (id IN (SELECT my_households()));

CREATE POLICY "household_delete" ON household
  FOR DELETE USING (id IN (SELECT my_households()));

CREATE POLICY "household_insert" ON household
  FOR INSERT WITH CHECK (true);

-- Allow inserting allocations without existing membership
CREATE POLICY "allocations_insert" ON allocations
  FOR INSERT WITH CHECK (true);

-- create_household(p_house_name, p_monthly_budget)
--
-- Called via supabase.rpc('create_household', { ... }) from the frontend.
-- Runs as SECURITY DEFINER (bypasses RLS) so it can:
--   1. Insert a new household row
--   2. Insert the allocation linking the caller to that household
--   3. Return the created household as JSON
--
-- This must be a single function because a plain INSERT ... RETURNING
-- through PostgREST fails: the SELECT policy on household requires the
-- caller to be in allocations, but the allocation row doesn't exist
-- until after the INSERT.
CREATE OR REPLACE FUNCTION create_household(
  p_house_name TEXT,
  p_monthly_budget NUMERIC DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_household record;
BEGIN
  -- auth.uid() reads the caller's ID from the JWT
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the household
  INSERT INTO household (house_name, monthly_budget)
  VALUES (p_house_name, p_monthly_budget)
  RETURNING * INTO v_household;

  -- Link the caller to the new household
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
