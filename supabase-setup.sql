-- ============================================================
-- SETUP COMPLETO DO BANCO DE DADOS - AUTOVITRAIS
-- Rode este script no Supabase Dashboard → SQL Editor
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABELA: stores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  city TEXT NOT NULL
);

INSERT INTO public.stores (id, name, code, city) VALUES
  ('store-1', 'Taubaté', 'TAU', 'Taubaté'),
  ('store-2', 'Pinda',   'PIN', 'Pindamonhangaba')
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 2. TABELA: profiles (usuários do sistema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  email                TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'ATENDENTE'
                         CHECK (role IN ('ADMIN','GERENTE','ATENDENTE','ESTOQUISTA')),
  store_id             TEXT REFERENCES public.stores(id),
  allow_cost_view      BOOLEAN NOT NULL DEFAULT FALSE,
  status               TEXT NOT NULL DEFAULT 'ativo'
                         CHECK (status IN ('ativo','inativo')),
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) - profiles
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Own profile read"  ON public.profiles;

-- Qualquer usuário autenticado pode ler todos os perfis
CREATE POLICY "Authenticated read all" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Qualquer usuário autenticado pode inserir (necessário para criar usuários)
CREATE POLICY "Authenticated insert" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Qualquer usuário autenticado pode atualizar (necessário para alterar status)
CREATE POLICY "Authenticated update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);


-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) - stores
-- ------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read stores" ON public.stores;

CREATE POLICY "Public read stores" ON public.stores
  FOR SELECT
  TO authenticated
  USING (TRUE);


-- ------------------------------------------------------------
-- 5. TRIGGER: cria perfil automaticamente ao registrar via auth
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, allow_cost_view, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'ATENDENTE',
    FALSE,
    'ativo'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
