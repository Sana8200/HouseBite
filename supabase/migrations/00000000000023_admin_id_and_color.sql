-- Add admin_id to household and household_color to allocations

-- 1. admin_id: who created/owns the household
ALTER TABLE household
  ADD COLUMN admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Backfill existing households (best-effort: pick first member in allocations)
UPDATE household h
SET admin_id = (
  SELECT member_id FROM allocations
  WHERE household_id = h.id
  LIMIT 1
);

-- 3. household_color: per-user color preference for each household they belong to
ALTER TABLE allocations
  ADD COLUMN household_color VARCHAR(10) NOT NULL DEFAULT '#228be6';

-- 4. Replace create_household to set admin_id and accept a color
CREATE OR REPLACE FUNCTION create_household(
  p_house_name     TEXT,
  p_monthly_budget NUMERIC DEFAULT NULL,
  p_color          TEXT    DEFAULT '#228be6'
)
RETURNS SETOF household LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_household     household;
  v_user_hh_count INT;
BEGIN
  SELECT COUNT(*) INTO v_user_hh_count
  FROM allocations WHERE member_id = v_user_id;

  IF v_user_hh_count >= 5 THEN
    RAISE EXCEPTION 'You can belong to at most 5 households';
  END IF;

  INSERT INTO household (house_name, monthly_budget, admin_id)
  VALUES (p_house_name, p_monthly_budget, v_user_id)
  RETURNING * INTO v_household;

  INSERT INTO allocations (member_id, household_id, household_color)
  VALUES (v_user_id, v_household.id, p_color);

  RETURN NEXT v_household;
END;
$$;

-- 5. Replace join_household to accept a color
CREATE OR REPLACE FUNCTION join_household(
  p_invite_id TEXT,
  p_color     TEXT DEFAULT '#228be6'
)
RETURNS SETOF household LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_household    household;
  v_user_hh_count INT;
  v_member_count  INT;
BEGIN
  SELECT * INTO v_household FROM household WHERE invite_id = p_invite_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Household not found';
  END IF;

  SELECT COUNT(*) INTO v_user_hh_count
  FROM allocations WHERE member_id = v_user_id;
  IF v_user_hh_count >= 5 THEN
    RAISE EXCEPTION 'You can belong to at most 5 households';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM allocations WHERE household_id = v_household.id;
  IF v_member_count >= 51 THEN
    RAISE EXCEPTION 'This household is full (max 51 members)';
  END IF;

  INSERT INTO allocations (member_id, household_id, household_color)
  VALUES (v_user_id, v_household.id, p_color)
  ON CONFLICT (member_id, household_id) DO NOTHING;

  RETURN NEXT v_household;
END;
$$;
