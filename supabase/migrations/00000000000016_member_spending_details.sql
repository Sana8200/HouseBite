-- First drop the existing function
DROP FUNCTION IF EXISTS get_household_member_spending(UUID, DATE);

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
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_spent NUMERIC;
BEGIN
  -- Calculate month boundaries
  v_start_date := DATE_TRUNC('month', p_month)::DATE;
  v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Get total spent for the month
  SELECT COALESCE(SUM(r.total), 0) INTO v_total_spent
  FROM receipt r
  WHERE r.household_id = p_household_id
    AND r.purchase_at >= v_start_date
    AND r.purchase_at <= v_end_date;
  
  RETURN QUERY
  WITH monthly_spending AS (
    SELECT 
      r.buyer_id,
      COALESCE(SUM(r.total), 0) AS amount_spent,
      COUNT(r.id) AS receipt_count
    FROM receipt r
    WHERE r.household_id = p_household_id
      AND r.purchase_at >= v_start_date
      AND r.purchase_at <= v_end_date
    GROUP BY r.buyer_id
  )
  SELECT 
    ms.buyer_id AS member_id,
    COALESCE(
      (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = ms.buyer_id),
      (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = ms.buyer_id),
      (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = ms.buyer_id),
      ms.buyer_id::text
    )::TEXT AS member_name,
    ms.amount_spent,
    ms.receipt_count,
    CASE 
      WHEN v_total_spent > 0 THEN ROUND((ms.amount_spent / v_total_spent) * 100, 2)
      ELSE 0
    END AS percentage_of_total,
    ROW_NUMBER() OVER (ORDER BY ms.amount_spent DESC)::INT AS color_index
  FROM monthly_spending ms
  ORDER BY ms.amount_spent DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_household_member_spending(UUID, DATE) TO authenticated;