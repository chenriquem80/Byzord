-- Corrige os 2 itens do Polo adicionados incorretamente ao estoque regular.
-- Este script:
--   1. Subtrai 2 do estoque regular de Pinda para o produto Polo (parabrisa)
--   2. Cria (ou acumula) uma linha com special_condition = 'R' para esses 2 itens

do $$
declare
  v_mf_id   uuid;
  v_store_id uuid;
  v_inv_id  uuid;
  v_stock   int;
begin
  -- Encontra o manufacturer_id do Polo parabrisa (Pilkington) e a loja Pinda
  select pm.id, s.id
    into v_mf_id, v_store_id
  from product_manufacturers pm
  join products p on p.id = pm.product_id
  join stores s on lower(s.name) like '%pinda%'
  where lower(p.name) like '%polo%'
    and lower(pm.manufacturer) like '%pilkington%'
  limit 1;

  if v_mf_id is null then
    raise exception 'Produto Polo/Pilkington não encontrado. Verifique o nome do produto.';
  end if;

  -- Subtrai 2 do estoque regular (special_condition IS NULL)
  update product_store_inventory
     set stock = greatest(stock - 2, 0)
   where manufacturer_id = v_mf_id
     and store_id = v_store_id
     and special_condition is null;

  -- Verifica se já existe linha especial R
  select id, stock
    into v_inv_id, v_stock
  from product_store_inventory
  where manufacturer_id = v_mf_id
    and store_id = v_store_id
    and special_condition = 'R';

  if v_inv_id is not null then
    -- Acumula na linha já existente
    update product_store_inventory
       set stock = v_stock + 2
     where id = v_inv_id;
  else
    -- Cria nova linha especial R
    insert into product_store_inventory
      (manufacturer_id, store_id, stock, min_quantity, special_condition)
    values
      (v_mf_id, v_store_id, 2, 0, 'R');
  end if;

  raise notice 'Correção aplicada: 2 itens movidos do estoque regular para condição especial R (Polo/Pilkington/Pinda).';
end;
$$;
