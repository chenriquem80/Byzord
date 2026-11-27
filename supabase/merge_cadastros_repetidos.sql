-- Junta itens cadastrados mais de uma vez (mesmo produto, característica, tipo e fabricante).
-- modo 'manter': cadastro duplicado por clique duplo — o estoque inicial foi lançado duas vezes,
--               então fica só o saldo do cadastro mantido.
-- modo 'somar' : cadastros feitos em momentos diferentes — os saldos são somados.
-- O cadastro mantido fica com o código de barras dele; o código do apagado deixa de existir.
-- Rodar de novo não faz nada (o cadastro apagado não existe mais).

BEGIN;

CREATE TEMP TABLE juntar (alvo uuid, origem uuid, modo text) ON COMMIT DROP;
INSERT INTO juntar VALUES
  ('1d1f0d2e-26cb-428a-96fd-b17e402e3096', '03b00a14-f268-4348-968d-1696cd9b3823', 'manter'), -- PULSE 22/26 VERDE AGC
  ('74e30564-bf6d-4a30-9161-57f30f0b35fd', '859413b6-b1e9-4ea0-be49-df32aaca4f10', 'manter'), -- BRONCO 2025/2026 SAINT-GOBAIN
  ('6fe59936-2bfb-466b-8457-52665ec3ef34', '3faca319-e425-4cb2-80d0-439447c79675', 'manter'), -- FUSION 2013/2016 PILKINGTON
  ('61abf030-2841-4ed1-be54-b228629c5c60', '3e4b8215-8f50-462d-8d72-9dd5963e7d1f', 'manter'), -- FUSION 2017/2021 PILKINGTON
  ('e7b5201c-c68a-45b6-9cb8-b61f553f4b79', '7fd0d742-1fee-4256-89a8-7b81a756fa77', 'somar'),  -- ASTRA 99/12 PILKINGTON
  ('62d911dc-6798-46b5-a674-19c113e1acfe', 'd115bc44-29b2-42ce-a32d-6b00767be4ff', 'somar'),  -- GOLF 14/15 PILKINGTON
  ('603aa0b1-7454-4175-bf47-349648129ffe', '7281769a-3414-472f-9595-d2870127f9e5', 'somar'),  -- GOL G2 A G4 96/08 PILKINGTON
  ('2bb32e48-cf3f-4b36-bdff-e8c07b8ef9dc', '902aa34a-afa4-40d4-9fe4-ea7b0be963cd', 'somar');  -- MONTANA 06/10 FLASH COVER

DELETE FROM juntar j WHERE NOT EXISTS (SELECT 1 FROM product_manufacturers m WHERE m.id = j.origem);

CREATE TEMP TABLE prod ON COMMIT DROP AS
SELECT j.*, a.product_id AS alvo_prod, o.product_id AS origem_prod
FROM juntar j
JOIN product_manufacturers a ON a.id = j.alvo
JOIN product_manufacturers o ON o.id = j.origem;

-- 1. Estoque: soma (ou só descarta, no modo 'manter') onde já existe a mesma loja/lado/condição
UPDATE product_store_inventory t
SET stock = t.stock + CASE WHEN p.modo = 'somar' THEN s.stock ELSE 0 END,
    location = CASE WHEN p.modo = 'somar' AND t.stock = 0 AND s.stock > 0 AND coalesce(s.location, '') <> ''
                    THEN s.location ELSE t.location END,
    updated_at = now()
FROM prod p
JOIN product_store_inventory s ON s.manufacturer_id = p.origem
WHERE t.manufacturer_id = p.alvo
  AND t.store_id = s.store_id
  AND t.lado IS NOT DISTINCT FROM s.lado
  AND t.special_condition IS NOT DISTINCT FROM s.special_condition;

DELETE FROM product_store_inventory s
USING prod p
WHERE s.manufacturer_id = p.origem
  AND EXISTS (SELECT 1 FROM product_store_inventory t
              WHERE t.manufacturer_id = p.alvo AND t.store_id = s.store_id
                AND t.lado IS NOT DISTINCT FROM s.lado
                AND t.special_condition IS NOT DISTINCT FROM s.special_condition);

-- Saldo que não tinha par no cadastro mantido passa para ele (no modo 'manter' é descartado)
DELETE FROM product_store_inventory s USING prod p WHERE s.manufacturer_id = p.origem AND p.modo = 'manter';
UPDATE product_store_inventory s SET manufacturer_id = p.alvo, updated_at = now()
FROM prod p WHERE s.manufacturer_id = p.origem;

-- 2. Fica com o custo, fornecedor e data da compra mais recente
UPDATE product_manufacturers a
SET cost = o.cost, supplier = o.supplier, last_purchase_date = o.last_purchase_date
FROM prod p JOIN product_manufacturers o ON o.id = p.origem
WHERE a.id = p.alvo AND o.last_purchase_date > a.last_purchase_date;

-- 3. Fotos e veículos compatíveis do cadastro apagado vão para o mantido, se ele não tiver
UPDATE product_photos f SET product_id = p.alvo_prod
FROM prod p
WHERE f.product_id = p.origem_prod
  AND NOT EXISTS (SELECT 1 FROM product_photos x WHERE x.product_id = p.alvo_prod);
UPDATE product_vehicle_compatibility c SET product_id = p.alvo_prod
FROM prod p
WHERE c.product_id = p.origem_prod
  AND NOT EXISTS (SELECT 1 FROM product_vehicle_compatibility x WHERE x.product_id = p.alvo_prod);

-- 4. Apaga o fabricante repetido e o produto, se ficou vazio
DELETE FROM product_manufacturers m USING prod p WHERE m.id = p.origem;
DELETE FROM product_photos f USING prod p
WHERE f.product_id = p.origem_prod
  AND NOT EXISTS (SELECT 1 FROM product_manufacturers m WHERE m.product_id = p.origem_prod);
DELETE FROM product_vehicle_compatibility c USING prod p
WHERE c.product_id = p.origem_prod
  AND NOT EXISTS (SELECT 1 FROM product_manufacturers m WHERE m.product_id = p.origem_prod);
DELETE FROM products pr USING prod p
WHERE pr.id = p.origem_prod
  AND NOT EXISTS (SELECT 1 FROM product_manufacturers m WHERE m.product_id = pr.id);

COMMIT;
