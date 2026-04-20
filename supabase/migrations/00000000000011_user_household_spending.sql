-- to get a specific user's monthly spending in a household
CREATE OR REPLACE FUNCTION get_user_household_monthly_spending(
  p_household_id UUID,
  p_user_id UUID DEFAULT auth.uid()  -- current user
)
RETURNS TABLE (
  month DATE,
  amount_spent NUMERIC,
  receipt_count BIGINT,
  household_total_spent NUMERIC,
  percentage_of_household NUMERIC,
  household_monthly_budget NUMERIC,
  budget_used_percentage NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH monthly_spending AS (
    SELECT 
      DATE_TRUNC('month', r.purchase_at)::DATE AS month,
      COALESCE(SUM(r.total), 0) AS amount_spent,
      COUNT(r.id) AS receipt_count,
      SUM(SUM(r.total)) OVER (PARTITION BY DATE_TRUNC('month', r.purchase_at)) AS household_total_spent
    FROM receipt r
    WHERE r.household_id = p_household_id
      AND r.buyer_id = p_user_id
    GROUP BY DATE_TRUNC('month', r.purchase_at)
  )
  SELECT 
    ms.month,
    ms.amount_spent,
    ms.receipt_count,
    ms.household_total_spent,
    CASE 
      WHEN ms.household_total_spent > 0 
      THEN ROUND((ms.amount_spent / ms.household_total_spent) * 100, 2)
      ELSE 0
    END AS percentage_of_household,
    h.monthly_budget AS household_monthly_budget,
    CASE 
      WHEN h.monthly_budget IS NOT NULL AND h.monthly_budget > 0 
      THEN ROUND((ms.household_total_spent / h.monthly_budget) * 100, 2)
      ELSE NULL
    END AS budget_used_percentage
  FROM monthly_spending ms
  CROSS JOIN household h
  WHERE h.id = p_household_id
  ORDER BY ms.month DESC;
$$;

GRANT EXECUTE ON FUNCTION get_user_household_monthly_spending(UUID, UUID) TO authenticated;

-- how to use it
-- get current user's spending in their household
-- const { data, error } = await supabase
--  .from('household_monthly_budget_summary')
--  .select('*')
--  .eq('household_id', householdId)
--  .eq('buyer_id', userId)  // or just filter in your app
--  .order('month', { ascending: false });