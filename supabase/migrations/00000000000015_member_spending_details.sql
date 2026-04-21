-- Get detailed spending per member for a specific month
CREATE OR REPLACE FUNCTION get_household_member_spending(
  p_household_id UUID,
  p_month DATE DEFAULT DATE_TRUNC('month', NOW())::DATE
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  amount_spent NUMERIC,
  receipt_count BIGINT,
  percentage_of_total NUMERIC,
  color_index INT
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH monthly_spending AS (
    SELECT 
      r.buyer_id,
      COALESCE(SUM(r.total), 0) AS amount_spent,
      COUNT(r.id) AS receipt_count
    FROM receipt r
    WHERE r.household_id = p_household_id
      AND DATE_TRUNC('month', r.purchase_at) = p_month
    GROUP BY r.buyer_id
  ),
  total_spent AS (
    SELECT COALESCE(SUM(amount_spent), 0) AS total FROM monthly_spending
  )
  SELECT 
    ms.buyer_id AS member_id,
    COALESCE(
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->>'username',
      split_part(u.email, '@', 1),
      'Unknown'
    )::TEXT AS member_name,
    ms.amount_spent,
    ms.receipt_count,
    CASE 
      WHEN ts.total > 0 THEN ROUND((ms.amount_spent / ts.total) * 100, 2)
      ELSE 0
    END AS percentage_of_total,
    ROW_NUMBER() OVER (ORDER BY ms.amount_spent DESC) AS color_index
  FROM monthly_spending ms
  CROSS JOIN total_spent ts
  JOIN auth.users u ON u.id = ms.buyer_id
  ORDER BY ms.amount_spent DESC
$$;

GRANT EXECUTE ON FUNCTION get_household_member_spending(UUID, DATE) TO authenticated;