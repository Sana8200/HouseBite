-- get_user_scanned_product_count()
--
-- Returns the number of products the current user has inserted via AI scan
-- (products linked to a receipt where buyer_id = auth.uid()).
-- Used by the frontend to block scanning when the 200-item limit is reached.
CREATE OR REPLACE FUNCTION get_user_scanned_product_count()
RETURNS INT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INT
  FROM product p
  JOIN receipt r ON p.receipt_id = r.id
  WHERE r.buyer_id = auth.uid()
$$;
