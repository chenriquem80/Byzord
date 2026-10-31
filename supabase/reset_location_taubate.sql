-- Reset location for all inventory items in stores located in Taubaté
-- This script sets the 'location' column to NULL (or empty string) for all rows
-- in the product_store_inventory table where the associated store is in the city 'Taubaté'.
-- Adjust the city name case/accents if needed.

UPDATE product_store_inventory
SET location = NULL  -- use '' if you prefer an empty string
WHERE store_id IN (
  SELECT id FROM stores WHERE city = 'Taubaté'
);

