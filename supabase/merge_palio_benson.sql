-- PALIO DEGRADÊ PARABRISA BENSON ficou em dois cadastros ("PALIO" e "PALIO ") e aparecia em duas
-- linhas no Estoque. Passa o saldo de Taubaté do repetido para o cadastro principal e apaga o repetido.
-- Só altera se o repetido ainda existir (rodar de novo não soma outra vez).
WITH removido AS (
  DELETE FROM product_store_inventory
  WHERE id = 'af9429dd-18d0-418a-b0c5-ea760ba892b4'
  RETURNING stock, location
)
UPDATE product_store_inventory i
SET stock = i.stock + r.stock, location = r.location
FROM removido r
WHERE i.id = '7e228227-e8c4-400f-a67a-87d4acbb8e55';

DELETE FROM product_manufacturers m
WHERE m.id = '3271d3a2-32a1-40f5-a124-5df12ea85ae9'
  AND NOT EXISTS (SELECT 1 FROM product_store_inventory i WHERE i.manufacturer_id = m.id);
