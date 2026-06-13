create table if not exists pending_attendances (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  store_id text,
  store_name text,
  service_id text,
  service_title text,
  billing_type text,
  executing_employee text,
  observations text,
  vehicle_photo_url text,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  created_at timestamptz not null default now()
);

alter table pending_attendances enable row level security;

create policy "Authenticated users can read pending_attendances"
  on pending_attendances for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert pending_attendances"
  on pending_attendances for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update pending_attendances"
  on pending_attendances for update
  using (auth.role() = 'authenticated');
