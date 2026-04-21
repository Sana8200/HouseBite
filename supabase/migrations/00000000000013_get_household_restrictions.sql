-- Returns all food restrictions for members of a household.
-- SECURITY DEFINER so it can read member_restriction and auth.users
-- without needing RLS policy changes.
CREATE OR REPLACE FUNCTION get_household_restrictions(p_household_id uuid)
RETURNS TABLE (member_id uuid, member_name text, restriction_id uuid, restriction_name text, category text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    a.member_id,
    COALESCE(u.raw_user_meta_data->>'display_name', u.email)::text AS member_name,
    fr.id AS restriction_id,
    fr.name AS restriction_name,
    fr.category
  FROM allocations a
  JOIN auth.users u ON u.id = a.member_id
  JOIN member_restriction mr ON mr.member_id = a.member_id
  JOIN food_restriction fr ON fr.id = mr.restriction_id
  WHERE a.household_id = p_household_id
$$;
