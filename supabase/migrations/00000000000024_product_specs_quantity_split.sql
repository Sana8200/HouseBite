-- Split product_specs.quantity into bought_quantity and current_quantity
-- bought_quantity: how much was purchased (set at scan/add time, never changes)
-- current_quantity: how much remains (decrements as items are consumed)

ALTER TABLE product_specs
  ADD COLUMN bought_quantity  INT,
  ADD COLUMN current_quantity INT;

UPDATE product_specs
SET bought_quantity  = quantity,
    current_quantity = quantity;

ALTER TABLE product_specs
  ALTER COLUMN bought_quantity  SET NOT NULL,
  ALTER COLUMN current_quantity SET NOT NULL;

ALTER TABLE product_specs DROP COLUMN quantity;
