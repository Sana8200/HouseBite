-- cross table for household food restrictions
CREATE TABLE household_food_restriction (
  household_id UUID REFERENCES household(id) ON DELETE CASCADE,
  restriction_id UUID REFERENCES food_restriction(id) ON DELETE CASCADE,
  PRIMARY KEY (household_id, restriction_id)
);

ALTER TABLE household_food_restriction ENABLE ROW LEVEL SECURITY;

-- household members can view/update their household's restrictions
CREATE POLICY "household members can manage restrictions" ON household_food_restriction
  FOR ALL USING (household_id IN (SELECT my_households()));


