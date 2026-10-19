-- ============================================================
-- Agenda por unidade: cada registro pertence a uma loja e só
-- usuários cadastrados nessa loja podem ver/criar/editar/excluir.
-- Rodar depois de create_agenda.sql.
-- ============================================================

alter table agenda
  add column if not exists store_id uuid references stores(id);

-- Registros antigos: herda a loja de quem registrou (pelo nome)
update agenda a
   set store_id = p.store_id
  from profiles p
 where a.store_id is null
   and p.name = a.user_name;

create index if not exists agenda_store_date_idx on agenda (store_id, event_date);

drop policy if exists "Authenticated users can manage agenda" on agenda;
drop policy if exists "Users manage agenda of own store" on agenda;
create policy "Users manage agenda of own store"
  on agenda for all to authenticated
  using (store_id = (select store_id from profiles where id = auth.uid()))
  with check (store_id = (select store_id from profiles where id = auth.uid()));
