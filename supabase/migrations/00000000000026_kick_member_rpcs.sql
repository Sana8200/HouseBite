CREATE OR REPLACE FUNCTION kick_member(p_household_id UUID, p_member_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT admin_id INTO v_admin_id FROM household WHERE id = p_household_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Household not found'; END IF;
  IF v_admin_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the admin can kick members'; END IF;
  IF p_member_id = auth.uid() THEN RAISE EXCEPTION 'Admin cannot kick themselves'; END IF;
  DELETE FROM allocations WHERE household_id = p_household_id AND member_id = p_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION kick_member_permanently(p_household_id UUID, p_member_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id   UUID;
  v_new_invite TEXT;
BEGIN
  SELECT admin_id INTO v_admin_id FROM household WHERE id = p_household_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Household not found'; END IF;
  IF v_admin_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the admin can kick members'; END IF;
  IF p_member_id = auth.uid() THEN RAISE EXCEPTION 'Admin cannot kick themselves'; END IF;
  DELETE FROM allocations WHERE household_id = p_household_id AND member_id = p_member_id;
  v_new_invite := substr(md5(random()::text), 1, 8);
  UPDATE household SET invite_id = v_new_invite WHERE id = p_household_id;
  RETURN v_new_invite;
END;
$$;

GRANT EXECUTE ON FUNCTION kick_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION kick_member_permanently(UUID, UUID) TO authenticated;
