-- remove old household_recipes table
DROP TABLE household_recipes CASCADE;
DROP POLICY "household members only" ON recipe;

-- new member_recipes (recipes linked to users)
CREATE TABLE member_recipes (
  member_id UUID REFERENCES family_member(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipe(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (member_id, recipe_id)
);

ALTER TABLE member_recipes ENABLE ROW LEVEL SECURITY;

-- users can see their own recipes
CREATE POLICY "users can see own recipes" ON member_recipes
  FOR ALL USING (member_id = auth.uid());

CREATE POLICY "users can see their own recipes" ON recipe
  FOR ALL USING (
    id IN (
      SELECT recipe_id FROM member_recipes WHERE member_id = auth.uid()
    )
  );