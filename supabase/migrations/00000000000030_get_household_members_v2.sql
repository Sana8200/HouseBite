-- Edit previous function to add avatar_id.

DROP FUNCTION IF EXISTS get_household_members(p_household_id uuid);

CREATE OR REPLACE FUNCTION get_household_members(p_household_id uuid)
RETURNS TABLE (id uuid, email text, display_name text, avatar_id text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    u.id,
    u.email::text,
    (u.raw_user_meta_data->>'display_name')::text,
    (u.raw_user_meta_data->>'avatar_id')::text
  FROM allocations a
  JOIN auth.users u ON u.id = a.member_id
  WHERE a.household_id = p_household_id
$$;
