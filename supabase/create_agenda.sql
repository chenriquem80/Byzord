create table if not exists agenda (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  description text not null,
  user_name text,
  created_at timestamptz default now()
);

create index if not exists agenda_event_date_idx on agenda (event_date);

alter table agenda enable row level security;

drop policy if exists "Authenticated users can manage agenda" on agenda;
create policy "Authenticated users can manage agenda"
  on agenda for all to authenticated using (true) with check (true);
