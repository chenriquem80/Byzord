-- Cria as tabelas de veículos e compatibilidade (se ainda não existirem)

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  automaker text not null,
  model text not null,
  generation text,
  start_year integer not null,
  end_year integer not null,
  version text,
  note text
);

create table if not exists product_vehicle_compatibility (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  note text
);

-- Habilitar RLS
alter table vehicles enable row level security;
alter table product_vehicle_compatibility enable row level security;

-- Políticas de acesso (usuários autenticados podem ler e escrever)
drop policy if exists "vehicles_all" on vehicles;
create policy "vehicles_all" on vehicles
  for all to authenticated using (true) with check (true);

drop policy if exists "compat_all" on product_vehicle_compatibility;
create policy "compat_all" on product_vehicle_compatibility
  for all to authenticated using (true) with check (true);
