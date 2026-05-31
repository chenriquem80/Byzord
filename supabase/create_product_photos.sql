-- 1. Tabela de fotos de produtos
create table if not exists product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);

-- 2. Permissões (RLS aberto para usuários autenticados)
alter table product_photos enable row level security;

create policy "Authenticated users can manage product photos"
  on product_photos
  for all
  to authenticated
  using (true)
  with check (true);
