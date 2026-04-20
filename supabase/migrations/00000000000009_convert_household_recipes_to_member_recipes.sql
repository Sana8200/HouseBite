-- recipes should be per-user only (not shared)


DROP TABLE household_recipes CASCADE;

CREATE TABLE member_recipes (
  member_id UUID REFERENCES family_member(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipe(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (member_id, recipe_id)
);

ALTER TABLE member_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can see own recipes" ON member_recipes
  FOR ALL USING (member_id = auth.uid());

-- drop old policy if exists, create new one
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipe' 
    AND policyname = 'household members only'
  ) THEN
    DROP POLICY "household members only" ON recipe;
  END IF;
END $$;

CREATE POLICY "users can see their own recipes" ON recipe
  FOR ALL USING (
    id IN (SELECT recipe_id FROM member_recipes WHERE member_id = auth.uid())
  );