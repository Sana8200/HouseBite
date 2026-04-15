INSERT INTO food_restriction (restriction) VALUES
  ('vegan'),
  ('vegetarian'),
  ('pescetarian'),
  ('gluten_free'),
  ('dairy_free'),
  ('lactose_free'),
  ('nut_free'),
  ('peanut_free'),
  ('egg_free'),
  ('soy_free'),
  ('shellfish_free'),
  ('low_sugar'),
  ('low_carb'),
  ('halal'),
  ('kosher')
ON CONFLICT DO NOTHING;
