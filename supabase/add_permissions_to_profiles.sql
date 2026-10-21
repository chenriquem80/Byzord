-- ============================================================
-- Permissões individuais por usuário.
-- profiles.permissions guarda só os ajustes em relação ao padrão
-- do perfil, ex.: {"/app/agenda": "read", "/app/saida": "none"}
-- Valores: "write" (alteração), "read" (consulta), "none" (sem acesso).
-- ============================================================

alter table profiles
  add column if not exists permissions jsonb;

-- Impede que um usuário comum altere o próprio perfil (role) ou
-- permissões via API; apenas administradores podem fazer isso.
create or replace function public.protect_profile_privileges()
returns trigger as $$
begin
  if (new.role is distinct from old.role or new.permissions is distinct from old.permissions)
     and auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN') then
    raise exception 'Apenas administradores podem alterar perfil e permissões de usuários';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_profile_privileges on profiles;
create trigger protect_profile_privileges
  before update on profiles
  for each row execute function public.protect_profile_privileges();

notify pgrst, 'reload schema';
