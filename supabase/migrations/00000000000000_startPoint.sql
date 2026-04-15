-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE restriction_type AS ENUM (
  'vegan', 'vegetarian', 'pescetarian',
  'gluten_free', 'dairy_free', 'lactose_free',
  'nut_free', 'peanut_free', 'egg_free', 'soy_free', 'shellfish_free',
  'low_sugar', 'low_carb', 'halal', 'kosher'
);

CREATE TYPE size_unit AS ENUM (
  'gr', 'ml', 'kg', 'L'
);

-- ─────────────────────────────────────────
-- HOUSEHOLD
-- ─────────────────────────────────────────
CREATE TABLE household (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_name      VARCHAR(100) NOT NULL,
  monthly_budget  NUMERIC(10,2),
  created_at      timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- FAMILY MEMBER
-- ─────────────────────────────────────────
CREATE TABLE family_member (
  id          uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
);

-- ─────────────────────────────────────────
-- ALLOCATIONS (member <-> household)
-- ─────────────────────────────────────────
CREATE TABLE allocations (
  member_id    uuid REFERENCES family_member(id) ON DELETE CASCADE,
  household_id uuid REFERENCES household(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, household_id)
);

-- ─────────────────────────────────────────
-- FOOD RESTRICTIONS
-- ─────────────────────────────────────────
CREATE TABLE food_restriction (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restriction restriction_type NOT NULL
);

CREATE TABLE member_restriction (
  member_id      uuid REFERENCES family_member(id) ON DELETE CASCADE,
  restriction_id uuid REFERENCES food_restriction(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, restriction_id)
);

-- ─────────────────────────────────────────
-- RECEIPT
-- ─────────────────────────────────────────
CREATE TABLE receipt (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES household(id) ON DELETE CASCADE NOT NULL,
  store_name   VARCHAR(100),
  total        NUMERIC(10,2),
  purchase_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- PRODUCT
-- ─────────────────────────────────────────
CREATE TABLE product (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES household(id) ON DELETE CASCADE NOT NULL,
  receipt_id   uuid REFERENCES receipt(id) ON DELETE SET NULL,
  name         VARCHAR(250) NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE product_specs (
  product_id      uuid REFERENCES product(id) ON DELETE CASCADE PRIMARY KEY,
  size            VARCHAR(250),
  quantity        INT NOT NULL DEFAULT 1,
  unit            size_unit,
  expiration_date DATE,
  price           NUMERIC(10,2)
);

-- ─────────────────────────────────────────
-- SHOPPING LIST + ITEMS
-- ─────────────────────────────────────────
CREATE TABLE shopping_list (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid REFERENCES household(id) ON DELETE CASCADE NOT NULL,
  name         VARCHAR(100) NOT NULL DEFAULT 'Shopping List',
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE shopping_item (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id uuid REFERENCES shopping_list(id) ON DELETE CASCADE NOT NULL,
  name             VARCHAR(100) NOT NULL,
  quantity         INT NOT NULL DEFAULT 1,
  size             VARCHAR(50),
  checked          BOOLEAN DEFAULT false
);

-- ─────────────────────────────────────────
-- RECIPES
-- ─────────────────────────────────────────
CREATE TABLE recipe (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  servings    INT,
  prep_time   INT,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE household_recipes (
  household_id uuid REFERENCES household(id) ON DELETE CASCADE,
  recipe_id    uuid REFERENCES recipe(id) ON DELETE CASCADE,
  PRIMARY KEY (household_id, recipe_id)
);

-- ─────────────────────────────────────────
-- STATS VIEW (derived, never stored)
-- ─────────────────────────────────────────
CREATE VIEW household_stats AS
SELECT
  h.id                          AS household_id,
  h.house_name,
  h.monthly_budget,
  COALESCE(SUM(r.total), 0)     AS total_spent,
  COALESCE(AVG(r.total), 0)     AS avg_receipt_value,
  COUNT(r.id)                   AS receipt_count
FROM household h
LEFT JOIN receipt r ON r.household_id = h.id
GROUP BY h.id, h.house_name, h.monthly_budget;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE household         ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_member     ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_restriction  ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_restriction ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_item     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe            ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_recipes ENABLE ROW LEVEL SECURITY;

-- Helper: get all household_ids the current user belongs to
-- Used in policies below to avoid repeating the subquery everywhere
CREATE OR REPLACE FUNCTION my_households()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT household_id FROM allocations WHERE member_id = auth.uid()
$$;

-- Household: members can see and update their own households
CREATE POLICY "members see own households" ON household
  FOR ALL USING (id IN (SELECT my_households()));

-- Family member: can only see/edit own profile
CREATE POLICY "own profile only" ON family_member
  FOR ALL USING (id = auth.uid());

-- Allocations: can see own memberships
CREATE POLICY "own allocations" ON allocations
  FOR ALL USING (member_id = auth.uid());

-- Receipt: household members only
CREATE POLICY "household members only" ON receipt
  FOR ALL USING (household_id IN (SELECT my_households()));

-- Product: household members only
CREATE POLICY "household members only" ON product
  FOR ALL USING (household_id IN (SELECT my_households()));

-- Product specs: via product ownership
CREATE POLICY "household members only" ON product_specs
  FOR ALL USING (
    product_id IN (
      SELECT id FROM product WHERE household_id IN (SELECT my_households())
    )
  );

-- Shopping list: household members only
CREATE POLICY "household members only" ON shopping_list
  FOR ALL USING (household_id IN (SELECT my_households()));

-- Shopping item: via shopping list ownership
CREATE POLICY "household members only" ON shopping_item
  FOR ALL USING (
    shopping_list_id IN (
      SELECT id FROM shopping_list WHERE household_id IN (SELECT my_households())
    )
  );

-- Recipes: households can see their own recipes
CREATE POLICY "household members only" ON household_recipes
  FOR ALL USING (household_id IN (SELECT my_households()));

CREATE POLICY "household members only" ON recipe
  FOR ALL USING (
    id IN (
      SELECT recipe_id FROM household_recipes
      WHERE household_id IN (SELECT my_households())
    )
  );

-- Food restrictions: readable by all authenticated users
CREATE POLICY "authenticated read" ON food_restriction
  FOR SELECT USING (auth.role() = 'authenticated');

-- Member restrictions: own restrictions only
CREATE POLICY "own restrictions only" ON member_restriction
  FOR ALL USING (member_id = auth.uid());