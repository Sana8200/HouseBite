-- delete_account(p_invite_id)
--
-- Called via supabase.rpc('delete_account', { ... }) from the frontend.
-- Runs as SECURITY DEFINER (bypasses RLS) so it can:
--  1. Delete family member for the id of the user
--  2. Delete the actual user from the database
CREATE OR REPLACE FUNCTION delete_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM family_member WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Trigger: delete a household when its last member leaves
CREATE OR REPLACE FUNCTION delete_orphan_household()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM household
  WHERE id = OLD.household_id
  AND NOT EXISTS (
    SELECT 1 FROM allocations WHERE household_id = OLD.household_id
  );
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER on_allocation_deleted
  AFTER DELETE ON allocations
  FOR EACH ROW EXECUTE FUNCTION delete_orphan_household();
