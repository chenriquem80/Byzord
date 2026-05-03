create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  city text,
  created_at timestamptz not null default now()
);

-- Tabela de perfis vinculada ao auth.users do Supabase
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null check (role in ('ADMIN', 'GERENTE', 'ATENDENTE', 'ESTOQUISTA')),
  store_id uuid references stores(id),
  allow_cost_view boolean not null default false,
  must_change_password boolean not null default true,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table profiles enable row level security;

-- Políticas básicas de RLS
create policy "Perfis visíveis para usuários autenticados" on profiles
  for select using (auth.role() = 'authenticated');

create policy "Usuários podem atualizar seu próprio perfil" on profiles
  for update using (auth.uid() = id);

-- Trigger para criar perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'ATENDENTE');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  contact text,
  whatsapp text,
  email text,
  products_supplied text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp text,
  email text,
  cpf_cnpj text,
  plate text,
  vehicle_model text,
  created_at timestamptz not null default now()
);

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

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique,
  supplier_code text,
  barcode text,
  name text not null,
  glass_type text not null,
  feature text not null,
  brand text,
  description text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists product_manufacturers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  manufacturer text not null,
  current_cost numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  last_purchase_date date,
  last_supplier_id uuid references suppliers(id),
  unique(product_id, manufacturer)
);

create table if not exists product_store_inventory (
  id uuid primary key default gen_random_uuid(),
  product_manufacturer_id uuid not null references product_manufacturers(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  location text,
  stock_quantity integer not null default 0,
  minimum_quantity integer not null default 0,
  unique(product_manufacturer_id, store_id)
);

create table if not exists product_vehicle_compatibility (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  note text
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  supplier_id uuid references suppliers(id),
  invoice_number text,
  purchase_date date not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid not null references products(id),
  manufacturer text not null,
  store_id uuid not null references stores(id),
  quantity integer not null,
  unit_cost numeric(12,2) not null
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  customer_id uuid references customers(id),
  payment_method text,
  customer_vehicle text,
  plate text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  manufacturer text not null,
  store_id uuid not null references stores(id),
  quantity integer not null,
  unit_price numeric(12,2) not null,
  discount numeric(12,2) not null default 0
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  manufacturer text not null,
  movement_type text not null check (movement_type in ('Entrada', 'Saída', 'Ajuste', 'Perda', 'Devolução')),
  quantity integer not null,
  supplier_id uuid references suppliers(id),
  reference_purchase_id uuid references purchases(id),
  reference_sale_id uuid references sales(id),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id),
  product_id uuid not null references products(id),
  manufacturer text not null,
  cost numeric(12,2) not null,
  sale_price numeric(12,2),
  purchase_date date,
  supplier_id uuid references suppliers(id),
  created_at timestamptz not null default now()
);

create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id) on delete cascade,
  payload jsonb not null,
  printed_at timestamptz,
  created_by uuid references profiles(id)
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  supplier_id uuid references suppliers(id),
  suggested_quantity integer not null,
  previous_cost numeric(12,2),
  note text,
  status text not null default 'aberto' check (status in ('aberto', 'enviado', 'recebido', 'cancelado')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists market_price_cache (
  id uuid primary key default gen_random_uuid(),
  product_id text not null, -- can be the internal_code or uuid
  search_term text not null,
  results_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists market_price_queries (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  search_term text not null,
  queried_at timestamptz not null default now(),
  source text not null,
  result_title text not null,
  result_price numeric(12,2) not null,
  result_url text,
  similarity_score numeric(4,2),
  is_cached boolean not null default false
);

create index if not exists idx_market_price_cache_product_id on market_price_cache(product_id);
create index if not exists idx_market_price_cache_expires_at on market_price_cache(expires_at);
create index if not exists idx_market_price_queries_product_id on market_price_queries(product_id);

