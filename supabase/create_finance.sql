-- Financeiro: funcionários (registro, férias, pagamentos/holerite/13º) e boletos.
-- Acesso: administrador, perfil FINANCEIRO ou usuário com a permissão da página liberada em profiles.permissions.

-- Novo perfil de usuário FINANCEIRO
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('ADMIN', 'GERENTE', 'ATENDENTE', 'ESTOQUISTA', 'FINANCEIRO'));

create or replace function public.has_page_access(page text, need_write boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and coalesce(p.status, 'ativo') <> 'inativo'
      and (
        p.role = 'ADMIN'
        -- perfil FINANCEIRO: acesso total à área, salvo se o administrador mudar a permissão do usuário
        or (p.role = 'FINANCEIRO' and page like '/app/financeiro/%'
            and coalesce(p.permissions ->> page, 'write') = 'write')
        or (p.role = 'FINANCEIRO' and page like '/app/financeiro/%' and not need_write
            and (p.permissions ->> page) = 'read')
        or (p.permissions ->> page) = 'write'
        or (not need_write and (p.permissions ->> page) = 'read')
      )
  );
$$;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text,
  job_title text,
  store_id text,
  admission_date date not null,
  salary numeric(12,2) not null default 0,          -- mensal: salário do mês; semanal: valor da semana
  payment_type text not null default 'mensal' check (payment_type in ('mensal', 'semanal')),
  advance_amount numeric(12,2) not null default 0,  -- vale do dia 15 (pagamento mensal)
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  dismissal_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_vacations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  acquisition_start date not null,
  acquisition_end date not null,
  status text not null default 'a_vencer' check (status in ('a_vencer', 'tirada')),
  taken_start date,
  taken_end date,
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, acquisition_start)
);

create table if not exists public.employee_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind text not null check (kind in ('vale', 'saldo', 'semanal', 'holerite', '13_primeira', '13_segunda', 'ferias', 'outro')),
  reference_month date not null,       -- primeiro dia do mês de referência
  due_date date not null,
  gross numeric(12,2) not null default 0,
  discounts numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,  -- líquido a pagar
  paid boolean not null default false,
  paid_at date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists employee_payments_month_idx on public.employee_payments (reference_month);
create index if not exists employee_payments_employee_idx on public.employee_payments (employee_id);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  description text,
  barcode text,
  amount numeric(12,2) not null default 0,
  issue_date date,
  due_date date not null,
  status text not null default 'aberto' check (status in ('aberto', 'pago')),
  paid_at date,
  store_id text,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists bills_due_idx on public.bills (due_date);
create index if not exists bills_supplier_idx on public.bills (supplier);

alter table public.employees enable row level security;
alter table public.employee_vacations enable row level security;
alter table public.employee_payments enable row level security;
alter table public.bills enable row level security;

do $$
declare t text;
begin
  foreach t in array array['employees', 'employee_vacations', 'employee_payments'] loop
    execute format('drop policy if exists "finance read" on public.%I', t);
    execute format('drop policy if exists "finance write" on public.%I', t);
    execute format('create policy "finance read" on public.%I for select to authenticated using (public.has_page_access(''/app/financeiro/funcionarios'', false))', t);
    execute format('create policy "finance write" on public.%I for all to authenticated using (public.has_page_access(''/app/financeiro/funcionarios'', true)) with check (public.has_page_access(''/app/financeiro/funcionarios'', true))', t);
  end loop;
end $$;

drop policy if exists "bills read" on public.bills;
drop policy if exists "bills write" on public.bills;
create policy "bills read" on public.bills for select to authenticated
  using (public.has_page_access('/app/financeiro/boletos', false));
create policy "bills write" on public.bills for all to authenticated
  using (public.has_page_access('/app/financeiro/boletos', true))
  with check (public.has_page_access('/app/financeiro/boletos', true));
