ALTER TABLE receipt 
  ADD COLUMN buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- index for better query performance
CREATE INDEX idx_receipt_buyer_id ON receipt(buyer_id);

-- Update RLS policies for receipt to include buyer access
DROP POLICY "household members only" ON receipt;

CREATE POLICY "household members can see receipts" ON receipt
  FOR SELECT USING (household_id IN (SELECT my_households()));

CREATE POLICY "household members can insert receipts" ON receipt
  FOR INSERT WITH CHECK (household_id IN (SELECT my_households()));

CREATE POLICY "household members can update receipts" ON receipt
  FOR UPDATE USING (household_id IN (SELECT my_households()));

CREATE POLICY "household members can delete receipts" ON receipt
  FOR DELETE USING (household_id IN (SELECT my_households()));