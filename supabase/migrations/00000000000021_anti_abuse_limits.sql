-- Anti-abuse limits
--
-- 1. create_household: user may belong to at most 6 households
-- 2. join_household:   user may belong to at most 6 households;
--                      household may have at most 51 members
-- 3. Trigger on product: user may have at most 200 AI-scanned items
--    (products linked to a receipt with that user as buyer_id)
-- 4. Trigger on receipt: global cap of 10 000 rows; oldest deleted on overflow

-- 1. create_household (replaces migration 1 version)
CREATE OR REPLACE FUNCTION create_household(
  p_house_name TEXT,
  p_monthly_budget NUMERIC DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id        uuid;
  v_user_hh_count  INT;
  v_household      record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*) INTO v_user_hh_count
  FROM allocations WHERE member_id = v_user_id;
  IF v_user_hh_count >= 5 THEN
    RAISE EXCEPTION 'You can belong to at most 5 households';
  END IF;

  INSERT INTO household (house_name, monthly_budget)
  VALUES (p_house_name, p_monthly_budget)
  RETURNING * INTO v_household;

  INSERT INTO allocations (member_id, household_id)
  VALUES (v_user_id, v_household.id);

  RETURN json_build_object(
    'id',             v_household.id,
    'house_name',     v_household.house_name,
    'invite_id',      v_household.invite_id,
    'monthly_budget', v_household.monthly_budget
  );
END;
$$;

-- 2. join_household (replaces migration 3 version)
CREATE OR REPLACE FUNCTION join_household(
  p_invite_id TEXT
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id        uuid;
  v_user_hh_count  INT;
  v_member_count   INT;
  v_household      record;
  v_existing       record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- User household cap
  SELECT COUNT(*) INTO v_user_hh_count
  FROM allocations WHERE member_id = v_user_id;
  IF v_user_hh_count >= 5 THEN
    RAISE EXCEPTION 'You can belong to at most 5 households';
  END IF;

  -- Find household by invite_id
  SELECT id, house_name, invite_id, monthly_budget
  INTO v_household
  FROM household
  WHERE invite_id = lower(trim(p_invite_id));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No household found with that invite ID';
  END IF;

  -- Already a member?
  SELECT member_id INTO v_existing
  FROM allocations
  WHERE member_id = v_user_id AND household_id = v_household.id;
  IF FOUND THEN
    RAISE EXCEPTION 'You are already a member of %', v_household.house_name;
  END IF;

  -- Household member cap
  SELECT COUNT(*) INTO v_member_count
  FROM allocations WHERE household_id = v_household.id;
  IF v_member_count >= 51 THEN
    RAISE EXCEPTION 'This household is full (max 51 members)';
  END IF;

  INSERT INTO allocations (member_id, household_id)
  VALUES (v_user_id, v_household.id);

  RETURN json_build_object(
    'id',             v_household.id,
    'house_name',     v_household.house_name,
    'invite_id',      v_household.invite_id,
    'monthly_budget', v_household.monthly_budget
  );
END;
$$;

-- 3. AI-scanned product limit per user (< 200)
CREATE OR REPLACE FUNCTION check_user_ai_scan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_buyer_id UUID;
  v_count    INT;
BEGIN
  IF NEW.receipt_id IS NULL THEN RETURN NEW; END IF;

  SELECT buyer_id INTO v_buyer_id FROM receipt WHERE id = NEW.receipt_id;
  IF v_buyer_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count
  FROM product p
  JOIN receipt r ON p.receipt_id = r.id
  WHERE r.buyer_id = v_buyer_id;

  IF v_count >= 200 THEN
    RAISE EXCEPTION 'You have reached the limit of 200 AI-scanned items';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_user_ai_scan_limit
BEFORE INSERT ON product
FOR EACH ROW EXECUTE FUNCTION check_user_ai_scan_limit();

-- 4. Global receipt cap: keep at most 10 000 rows, purge oldest on overflow
CREATE OR REPLACE FUNCTION enforce_receipt_global_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM receipt;
  IF v_total > 10000 THEN
    DELETE FROM receipt
    WHERE id IN (
      SELECT id FROM receipt
      ORDER BY purchase_at ASC, created_at ASC
      LIMIT (v_total - 10000)
    );
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_receipt_global_limit
AFTER INSERT ON receipt
FOR EACH STATEMENT EXECUTE FUNCTION enforce_receipt_global_limit();
