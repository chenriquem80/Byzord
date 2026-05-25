-- Políticas RLS para as tabelas principais do estoque
-- Execute este script no Supabase Dashboard > SQL Editor

-- =====================
-- PRODUCTS
-- =====================
drop policy if exists "Produtos leitura autenticado" on products;
drop policy if exists "Produtos inserir autenticado" on products;
drop policy if exists "Produtos atualizar autenticado" on products;
drop policy if exists "Produtos deletar autenticado" on products;

create policy "Produtos leitura autenticado" on products
  for select using (auth.role() = 'authenticated');

create policy "Produtos inserir autenticado" on products
  for insert with check (auth.role() = 'authenticated');

create policy "Produtos atualizar autenticado" on products
  for update using (auth.role() = 'authenticated');

create policy "Produtos deletar autenticado" on products
  for delete using (auth.role() = 'authenticated');

-- =====================
-- PRODUCT_MANUFACTURERS
-- =====================
alter table product_manufacturers enable row level security;

drop policy if exists "Fabricantes leitura autenticado" on product_manufacturers;
drop policy if exists "Fabricantes inserir autenticado" on product_manufacturers;
drop policy if exists "Fabricantes atualizar autenticado" on product_manufacturers;
drop policy if exists "Fabricantes deletar autenticado" on product_manufacturers;

create policy "Fabricantes leitura autenticado" on product_manufacturers
  for select using (auth.role() = 'authenticated');

create policy "Fabricantes inserir autenticado" on product_manufacturers
  for insert with check (auth.role() = 'authenticated');

create policy "Fabricantes atualizar autenticado" on product_manufacturers
  for update using (auth.role() = 'authenticated');

create policy "Fabricantes deletar autenticado" on product_manufacturers
  for delete using (auth.role() = 'authenticated');

-- =====================
-- PRODUCT_STORE_INVENTORY
-- =====================
alter table product_store_inventory enable row level security;

drop policy if exists "Inventario leitura autenticado" on product_store_inventory;
drop policy if exists "Inventario inserir autenticado" on product_store_inventory;
drop policy if exists "Inventario atualizar autenticado" on product_store_inventory;
drop policy if exists "Inventario deletar autenticado" on product_store_inventory;

create policy "Inventario leitura autenticado" on product_store_inventory
  for select using (auth.role() = 'authenticated');

create policy "Inventario inserir autenticado" on product_store_inventory
  for insert with check (auth.role() = 'authenticated');

create policy "Inventario atualizar autenticado" on product_store_inventory
  for update using (auth.role() = 'authenticated');

create policy "Inventario deletar autenticado" on product_store_inventory
  for delete using (auth.role() = 'authenticated');

-- =====================
-- STORES
-- =====================
alter table stores enable row level security;

drop policy if exists "Lojas leitura autenticado" on stores;

create policy "Lojas leitura autenticado" on stores
  for select using (auth.role() = 'authenticated');
