-- ============================================================
-- Código de pintura por veículo (aba Funções → Pintura).
-- Compartilhado entre as unidades: o código da tinta é do veículo.
-- Placa e chassi são gravados sem traço/espaços, em maiúsculas.
-- ============================================================

create table if not exists vehicle_paints (
  id uuid primary key default gen_random_uuid(),
  plate text,
  vin text,
  make text,
  model text,
  model_year text,
  paint_code text not null,
  color_name text,
  notes text,
  user_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists vehicle_paints_plate_idx on vehicle_paints (plate);
create index if not exists vehicle_paints_vin_idx on vehicle_paints (vin);

alter table vehicle_paints enable row level security;

drop policy if exists "Authenticated users can manage vehicle_paints" on vehicle_paints;
create policy "Authenticated users can manage vehicle_paints"
  on vehicle_paints for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
