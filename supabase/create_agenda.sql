-- ============================================================
-- Agenda virtual por unidade.
-- Usuários acessam apenas os registros da própria loja;
-- administradores acessam os de todas as unidades.
-- Obs.: neste banco stores.id é do tipo text.
-- ============================================================

create table if not exists agenda (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  description text not null,
  user_name text,
  store_id text references stores(id),
  created_at timestamptz default now()
);

create index if not exists agenda_store_date_idx on agenda (store_id, event_date);

alter table agenda enable row level security;

drop policy if exists "Users manage agenda of own store or admin" on agenda;
create policy "Users manage agenda of own store or admin"
  on agenda for all to authenticated
  using (
    exists (
      select 1 from profiles p
       where p.id = auth.uid()
         and (p.role = 'ADMIN' or p.store_id::text = agenda.store_id)
    )
  )
  with check (
    store_id is not null
    and exists (
      select 1 from profiles p
       where p.id = auth.uid()
         and (p.role = 'ADMIN' or p.store_id::text = agenda.store_id)
    )
  );

notify pgrst, 'reload schema';
