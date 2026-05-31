create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table services enable row level security;

create policy "Authenticated users can manage services"
  on services for all to authenticated using (true) with check (true);

insert into services (title, description) values
  ('Troca de parabrisa', 'Servico completo com aplicacao principal.'),
  ('Troca de vigia', 'Atendimento traseiro e acabamento.'),
  ('Vidro de porta', 'Dianteiro, traseiro ou lateral fixa.'),
  ('Maquina / regulagem', 'Ajuste de mecanismo e funcionamento.'),
  ('Pelicula / acabamento', 'Servicos complementares no balcao.'),
  ('Outro servico', 'Atendimento especial ou sob analise.');
