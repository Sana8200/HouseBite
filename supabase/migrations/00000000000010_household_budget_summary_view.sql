-- used AI for this migration

-- view for monthly budget summary by member
CREATE OR REPLACE VIEW household_monthly_budget_summary AS
WITH monthly_spending AS (
  SELECT 
    r.household_id,
    r.buyer_id,
    DATE_TRUNC('month', r.purchase_at) AS month,
    COALESCE(SUM(r.total), 0) AS amount_spent,
    COUNT(r.id) AS receipt_count
  FROM receipt r
  GROUP BY r.household_id, r.buyer_id, DATE_TRUNC('month', r.purchase_at)
),
household_budgets AS (
  SELECT 
    h.id AS household_id,
    h.monthly_budget,
    h.house_name
  FROM household h
)
SELECT 
  hb.household_id,
  hb.house_name,
  hb.monthly_budget AS household_monthly_budget,
  ms.month,
  ms.buyer_id,
  fm.id AS member_exists, -- to check if buyer is still a HH member
  ms.amount_spent AS member_monthly_spent,
  ms.receipt_count AS member_receipt_count,
  SUM(ms.amount_spent) OVER (PARTITION BY ms.household_id, ms.month) AS household_total_spent,
  CASE 
    WHEN hb.monthly_budget IS NOT NULL AND hb.monthly_budget > 0 
    THEN ROUND((SUM(ms.amount_spent) OVER (PARTITION BY ms.household_id, ms.month) / hb.monthly_budget) * 100, 2)
    ELSE NULL
  END AS budget_used_percentage
FROM household_budgets hb
LEFT JOIN monthly_spending ms ON ms.household_id = hb.household_id
LEFT JOIN family_member fm ON fm.id = ms.buyer_id
ORDER BY hb.household_id, ms.month DESC, ms.amount_spent DESC;

-- give access to authenticated users
GRANT SELECT ON household_monthly_budget_summary TO authenticated, anon;

-- Optional: Create a function to get budget summary for a specific household
CREATE OR REPLACE FUNCTION get_household_budget_summary(p_household_id UUID)
RETURNS TABLE (
  month DATE,
  buyer_id UUID,
  member_monthly_spent NUMERIC,
  member_receipt_count BIGINT,
  household_total_spent NUMERIC,
  household_monthly_budget NUMERIC,
  budget_used_percentage NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    ms.month,
    ms.buyer_id,
    ms.amount_spent AS member_monthly_spent,
    ms.receipt_count AS member_receipt_count,
    SUM(ms.amount_spent) OVER (PARTITION BY ms.household_id, ms.month) AS household_total_spent,
    h.monthly_budget AS household_monthly_budget,
    CASE 
      WHEN h.monthly_budget IS NOT NULL AND h.monthly_budget > 0 
      THEN ROUND((SUM(ms.amount_spent) OVER (PARTITION BY ms.household_id, ms.month) / h.monthly_budget) * 100, 2)
      ELSE NULL
    END AS budget_used_percentage
  FROM monthly_spending ms
  JOIN household h ON h.id = ms.household_id
  WHERE ms.household_id = p_household_id
  ORDER BY ms.month DESC, ms.amount_spent DESC;
$$;