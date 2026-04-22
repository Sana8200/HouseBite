-- Debug function to check receipts for a household
CREATE OR REPLACE FUNCTION debug_household_receipts(p_household_id UUID)
RETURNS TABLE (
  receipt_id UUID,
  buyer_id UUID,
  total NUMERIC,
  purchase_at DATE,
  month_trunc DATE
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    r.id,
    r.buyer_id,
    r.total,
    r.purchase_at,
    DATE_TRUNC('month', r.purchase_at)::DATE as month_trunc
  FROM receipt r
  WHERE r.household_id = p_household_id
  ORDER BY r.purchase_at DESC
  LIMIT 10;
$$;

SELECT * FROM get_household_member_spending('5f5e9023-7e31-4b08-a7d0-a5b07e503aed'::UUID);

