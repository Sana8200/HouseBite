-- getHouseholdMemberCount was querying allocations directly, but RLS
-- restricts that table to only the current user's own row, so the count
-- was always 1. This RPC bypasses RLS safely by only allowing counts
-- for households the caller actually belongs to.

CREATE OR REPLACE FUNCTION get_household_member_count(p_household_id UUID)
RETURNS INT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INT FROM allocations
  WHERE household_id = p_household_id
    AND p_household_id IN (SELECT my_households())
$$;
