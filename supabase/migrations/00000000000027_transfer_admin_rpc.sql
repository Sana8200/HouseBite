-- transfer_admin: lets the current admin hand over the role to another member.
-- SECURITY DEFINER needed to UPDATE household (RLS only allows members to read it,
-- not to write admin_id directly).
CREATE OR REPLACE FUNCTION transfer_admin(p_household_id UUID, p_new_admin_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT admin_id INTO v_admin_id FROM household WHERE id = p_household_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Household not found'; END IF;
  IF v_admin_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the admin can transfer admin rights'; END IF;
  IF p_new_admin_id = auth.uid() THEN RAISE EXCEPTION 'You are already the admin'; END IF;

  -- Verify the target is actually a member of the household
  IF NOT EXISTS (SELECT 1 FROM allocations WHERE household_id = p_household_id AND member_id = p_new_admin_id) THEN
    RAISE EXCEPTION 'Target user is not a member of this household';
  END IF;

  UPDATE household SET admin_id = p_new_admin_id WHERE id = p_household_id;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_admin(UUID, UUID) TO authenticated;
