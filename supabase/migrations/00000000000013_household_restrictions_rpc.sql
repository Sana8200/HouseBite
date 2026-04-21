-- Returns all food restrictions for every member in a given household.
-- SECURITY DEFINER bypasses RLS so we can read other members' restrictions,
-- but the caller must belong to the household (checked inside the function).
CREATE OR REPLACE FUNCTION get_household_restrictions(p_household_id uuid)
RETURNS TABLE(id uuid, name text, category text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT fr.id, fr.name, fr.category
  FROM member_restriction mr
  JOIN food_restriction fr ON fr.id = mr.restriction_id
  WHERE mr.member_id IN (
    SELECT member_id FROM allocations WHERE household_id = p_household_id
  )
  -- Safety check: only allow if the caller is a member of this household
  AND p_household_id IN (SELECT my_households())
  ORDER BY fr.category, fr.name
$$;
