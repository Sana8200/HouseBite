-- Returns members of a household by reading directly from auth.users.
-- SECURITY DEFINER so it can access auth.users (not exposed to clients).
-- No schema changes needed — family_member and allocations stay as-is.
CREATE OR REPLACE FUNCTION get_household_members(p_household_id uuid)
RETURNS TABLE (id uuid, email text, display_name text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    u.id,
    u.email::text,
    (u.raw_user_meta_data->>'display_name')::text
  FROM allocations a
  JOIN auth.users u ON u.id = a.member_id
  WHERE a.household_id = p_household_id
$$;
