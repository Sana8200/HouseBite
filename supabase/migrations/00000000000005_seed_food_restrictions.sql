
INSERT INTO food_restriction (restriction) VALUES
  ('vegan'), ('vegetarian'), ('pescetarian'),
  ('gluten_free'), ('dairy_free'), ('nut_free'),
  ('halal'), ('kosher'), ('low_carb'),
  ('low_fat'), ('low_sodium'), ('sugar_free'), ('loctose_intolerant'), ('diabetic_friendly'), 
ON CONFLICT DO NOTHING;
