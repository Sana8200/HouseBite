ALTER TABLE shopping_item
  DROP COLUMN quantity,
  DROP COLUMN size,
  ADD COLUMN notes VARCHAR(1000);
