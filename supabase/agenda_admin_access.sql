-- ============================================================
-- Agenda: administradores acessam os registros de todas as
-- unidades; demais usuários apenas os da própria loja.
-- Rodar depois de agenda_store_access.sql.
-- ============================================================

drop policy if exists "Users manage agenda of own store" on agenda;
drop policy if exists "Users manage agenda of own store or admin" on agenda;
create policy "Users manage agenda of own store or admin"
  on agenda for all to authenticated
  using (
    exists (
      select 1 from profiles p
       where p.id = auth.uid()
         and (p.role = 'ADMIN' or p.store_id = agenda.store_id)
    )
  )
  with check (
    store_id is not null
    and exists (
      select 1 from profiles p
       where p.id = auth.uid()
         and (p.role = 'ADMIN' or p.store_id = agenda.store_id)
    )
  );
