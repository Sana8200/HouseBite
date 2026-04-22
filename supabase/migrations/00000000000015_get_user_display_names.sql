-- Function to get display names for multiple users in a household
-- This is more efficient than calling get_household_members for each user
CREATE OR REPLACE FUNCTION get_household_member_names(p_household_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    u.id AS user_id,
    COALESCE(
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->>'username',
      split_part(u.email, '@', 1),
      'Unknown'
    )::TEXT AS display_name
  FROM allocations a
  JOIN auth.users u ON u.id = a.member_id
  WHERE a.household_id = p_household_id
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_household_member_names(UUID) TO authenticated;