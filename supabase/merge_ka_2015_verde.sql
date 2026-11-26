-- KA 2015/2021 VERDE PARABRISA PILKINGTON ficou em dois cadastros. Mantém o mais antigo
-- (f931fc2b, com foto, código 7898048976825) e passa para ele o saldo de Taubaté do repetido
-- (ad913e4e, código 7891893480036). Rodar de novo não soma outra vez.
WITH removido AS (
  DELETE FROM product_store_inventory
  WHERE manufacturer_id = 'ca9a9000-afc6-4987-8aa6-76ef43d74aa8'
  RETURNING store_id, stock
)
UPDATE product_store_inventory i
SET stock = i.stock + r.stock, updated_at = now()
FROM (SELECT store_id, sum(stock) AS stock FROM removido GROUP BY store_id) r
WHERE i.manufacturer_id = 'f34201da-83df-4687-adff-9154837c91a1'
  AND i.store_id = r.store_id
  AND i.lado IS NULL;

DELETE FROM product_manufacturers m
WHERE m.id = 'ca9a9000-afc6-4987-8aa6-76ef43d74aa8'
  AND NOT EXISTS (SELECT 1 FROM product_store_inventory i WHERE i.manufacturer_id = m.id);

DELETE FROM products p
WHERE p.id = 'ad913e4e-4f81-430e-bc30-d551d39d4f28'
  AND NOT EXISTS (SELECT 1 FROM product_manufacturers m WHERE m.product_id = p.id);
