create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  type text not null,          -- 'Entrada' | 'Saída' | 'Ajuste'
  product_name text not null,
  store_name text not null,
  manufacturer text,
  user_name text,
  quantity int not null,
  note text,
  created_at timestamptz default now()
);

alter table stock_movements enable row level security;

drop policy if exists "Authenticated users can manage stock_movements" on stock_movements;
create policy "Authenticated users can manage stock_movements"
  on stock_movements for all to authenticated using (true) with check (true);
