ALTER TABLE household
  ADD CONSTRAINT budget_non_negative CHECK (monthly_budget IS NULL OR monthly_budget >= 0);
