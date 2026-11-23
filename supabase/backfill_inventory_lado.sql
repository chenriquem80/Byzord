-- Itens cadastrados em "Novo Item" gravavam o lado só em products.lado, e o Estoque lê
-- product_store_inventory.lado. Copia o lado do produto para os registros que ficaram sem lado.
-- Não altera quantidade nem registros que já têm lado; pula se o lado já existir no mesmo
-- fabricante/loja/condição (evita registro repetido).
UPDATE product_store_inventory i
SET lado = p.lado
FROM product_manufacturers m
JOIN products p ON p.id = m.product_id
WHERE m.id = i.manufacturer_id
  AND i.lado IS NULL
  AND p.lado IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_store_inventory o
    WHERE o.manufacturer_id = i.manufacturer_id
      AND o.store_id = i.store_id
      AND o.special_condition IS NOT DISTINCT FROM i.special_condition
      AND o.lado = p.lado
  );
