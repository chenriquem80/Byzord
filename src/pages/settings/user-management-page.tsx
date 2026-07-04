import { useEffect, useState } from "react";
import { Plus, Search, UserMinus, UserCheck, Shield, ShieldCheck, KeyRound, UserCog } from "lucide-react";
import { supabase, supabaseAdmin } from "@/lib/database";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { User, UserRole } from "@/types/domain";
import { useAuth } from "@/contexts/auth-context";
import { stores as mockStores } from "@/data/mock-data";
import {
  ALL_PAGES,
  PAGE_LABELS,
  type AppPage,
  type PagePermission,
  type RolePermissionMap,
  getRolePermissions,
  saveRolePermissions,
} from "@/lib/permissions";

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [_loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Estado para edição de perfil (role) do usuário
  const [editRoleUser, setEditRoleUser] = useState<User | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<UserRole>("ATENDENTE");
  const [isRoleSaving, setIsRoleSaving] = useState(false);

  // Permissões
  const [permissionsRole, setPermissionsRole] = useState<UserRole | null>(null);
  const [permissionsMap, setPermissionsMap] = useState<RolePermissionMap | null>(null);

  // Form states
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("ATENDENTE");
  const [newStoreId, setNewStoreId] = useState(mockStores[0].id);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`*, stores (name)`);
      if (error) throw error;

      // Se o cliente admin estiver disponível, busca todos os usuários do Auth
      // e cruza com os profiles — garante que usuários sem profile apareçam na lista
      if (supabaseAdmin) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authError && authData?.users) {
          const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
          setUsers(
            authData.users.map((authUser) => {
              const profile = profileMap.get(authUser.id);
              return {
                id: authUser.id,
                name: profile?.name ?? authUser.user_metadata?.name ?? authUser.email?.split("@")[0] ?? "—",
                email: authUser.email ?? "",
                role: (profile?.role as UserRole) ?? "ATENDENTE",
                storeId: profile?.store_id ?? mockStores[0].id,
                storeName: profile?.stores?.name ?? "Sem loja",
                allowCostView: profile?.allow_cost_view ?? false,
                status: profile?.status ?? "ativo",
                mustChangePassword: profile?.must_change_password ?? true,
              };
            }),
          );
          return;
        }
      }

      // Fallback: apenas profiles
      if (profiles) {
        setUsers(profiles.map((item: any) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          role: item.role as UserRole,
          storeId: item.store_id,
          storeName: item.stores?.name ?? "Sem loja",
          allowCostView: item.allow_cost_view,
          status: item.status,
          mustChangePassword: item.must_change_password,
        })));
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || (u as any).status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (newPassword.length < 6) {
      setCreateError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (!supabase) {
      setIsCreateModalOpen(false);
      setTempPassword(newPassword);
      return;
    }

    setIsSubmitting(true);
    try {
      if (supabaseAdmin) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: newEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { name: newName },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Usuário não foi criado.");

        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          name: newName,
          email: newEmail,
          role: newRole,
          store_id: newStoreId,
          allow_cost_view: newRole === "ADMIN" || newRole === "GERENTE",
          status: "ativo",
          must_change_password: false,
        });
        if (profileError) throw profileError;
      } else {
        const tempClient = (await import("@supabase/supabase-js")).createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: newEmail,
          password: newPassword,
          options: { data: { name: newName } },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Usuário não foi criado.");

        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          name: newName,
          email: newEmail,
          role: newRole,
          store_id: newStoreId,
          allow_cost_view: newRole === "ADMIN" || newRole === "GERENTE",
          status: "ativo",
          must_change_password: false,
        });
        if (profileError) throw profileError;
      }

      setIsCreateModalOpen(false);
      setTempPassword(newPassword);
      setNewName(""); setNewEmail(""); setNewPassword("");
      setNewRole("ATENDENTE"); setNewStoreId(mockStores[0].id);
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message ?? "Erro ao criar usuário.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleUserStatus(user: User) {
    if (!supabase) return;
    const newStatus = (user as any).status === "ativo" ? "inativo" : "ativo";
    try {
      const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", user.id);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

  async function forcePasswordChange(user: User) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", user.id);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error("Erro ao solicitar troca de senha:", err);
    }
  }

  function openPermissions(user: User) {
    setPermissionsRole(user.role);
    setPermissionsMap({ ...getRolePermissions(user.role) });
  }

  function handlePermissionChange(page: AppPage, value: PagePermission) {
    setPermissionsMap(prev => prev ? { ...prev, [page]: value } : prev);
  }

  function savePermissions() {
    if (!permissionsRole || !permissionsMap) return;
    saveRolePermissions(permissionsRole, permissionsMap);
    setPermissionsRole(null);
    setPermissionsMap(null);
  }

  function openEditRole(user: User) {
    setEditRoleUser(user);
    setEditRoleValue(user.role);
  }

  async function handleSaveRole() {
    if (!editRoleUser || !supabase) return;
    setIsRoleSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: editRoleValue,
          allow_cost_view: editRoleValue === "ADMIN" || editRoleValue === "GERENTE",
        })
        .eq("id", editRoleUser.id);
      if (error) throw error;
      setEditRoleUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Erro ao alterar perfil:", err);
    } finally {
      setIsRoleSaving(false);
    }
  }

  const PERMISSION_OPTIONS: { value: PagePermission; label: string; color: string }[] = [
    { value: "write", label: "✏️ Edição",      color: "text-emerald-700 bg-emerald-50" },
    { value: "read",  label: "👁️ Consulta",    color: "text-blue-700 bg-blue-50" },
    { value: "none",  label: "🚫 Sem acesso",  color: "text-slate-500 bg-slate-100" },
  ];

  const columns = [
    {
      header: "Usuário",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.original.name}</span>
          <span className="text-xs text-slate-500">{row.original.email}</span>
        </div>
      ),
    },
    {
      header: "Perfil",
      cell: ({ row }: any) =>
        isAdmin ? (
          <button
            type="button"
            onClick={() => openEditRole(row.original)}
            title="Clique para alterar o perfil"
            className="group"
          >
            <Badge className="bg-slate-100 font-medium transition-colors group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:ring-2 group-hover:ring-blue-200 cursor-pointer">
              <UserCog className="mr-1 size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              {row.original.role}
            </Badge>
          </button>
        ) : (
          <Badge className="bg-slate-100 font-medium">{row.original.role}</Badge>
        ),
    },
    { header: "Loja", accessorKey: "storeName" },
    {
      header: "Status",
      cell: ({ row }: any) => (
        <Badge className={row.original.status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
          {row.original.status === "ativo" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPermissions(row.original)}
            className="size-9 p-0"
            title="Editar permissões"
          >
            <ShieldCheck className="size-4 text-blue-500" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleUserStatus(row.original)}
            className="size-9 p-0"
            title={row.original.status === "ativo" ? "Desativar usuário" : "Ativar usuário"}
          >
            {row.original.status === "ativo"
              ? <UserMinus className="size-4 text-rose-500" />
              : <UserCheck className="size-4 text-emerald-500" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => forcePasswordChange(row.original)}
            className={`size-9 p-0 ${row.original.mustChangePassword ? "border-amber-300 bg-amber-50" : ""}`}
            title={row.original.mustChangePassword ? "Troca de senha já solicitada" : "Solicitar troca de senha no próximo acesso"}
          >
            <KeyRound className={`size-4 ${row.original.mustChangePassword ? "text-amber-500" : "text-slate-500"}`} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionCard
        title="Gerenciamento de Usuários"
        description="Controle quem acessa o sistema, defina perfis e gerencie status."
        action={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 size-4" />
            Novo Usuário
          </Button>
        }
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">Todos os perfis</option>
              <option value="ADMIN">ADMIN</option>
              <option value="GERENTE">GERENTE</option>
              <option value="ATENDENTE">ATENDENTE</option>
              <option value="ESTOQUISTA">ESTOQUISTA</option>
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <DataTable columns={columns} data={filteredUsers} />
        </div>
      </SectionCard>

      {/* Modal: Editar Permissões */}
      <Dialog open={!!permissionsRole} onOpenChange={() => { setPermissionsRole(null); setPermissionsMap(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissões — {permissionsRole}</DialogTitle>
            <DialogDescription>
              Defina o nível de acesso para cada página deste perfil.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {ALL_PAGES.map((page) => (
              <div key={page} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2">
                <span className="text-sm font-medium text-slate-700">{PAGE_LABELS[page]}</span>
                <div className="flex gap-1">
                  {PERMISSION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handlePermissionChange(page, opt.value)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        permissionsMap?.[page] === opt.value
                          ? opt.color + " ring-2 ring-offset-1 ring-current"
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setPermissionsRole(null); setPermissionsMap(null); }}>
              Cancelar
            </Button>
            <Button onClick={savePermissions}>
              Salvar permissões
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Perfil do Usuário */}
      <Dialog open={!!editRoleUser} onOpenChange={() => setEditRoleUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-blue-500" />
              Alterar Perfil
            </DialogTitle>
            <DialogDescription>
              Altere o perfil de acesso de <strong>{editRoleUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Usuário</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{editRoleUser?.name}</p>
              <p className="text-xs text-slate-500">{editRoleUser?.email}</p>
            </div>

            <FormField label="Novo perfil">
              <div className="grid grid-cols-2 gap-2">
                {(["ADMIN", "GERENTE", "ATENDENTE", "ESTOQUISTA"] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setEditRoleValue(role)}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                      editRoleValue === role
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </FormField>

            {editRoleValue !== editRoleUser?.role && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                ⚠️ O perfil será alterado de <strong>{editRoleUser?.role}</strong> para <strong>{editRoleValue}</strong>. As permissões do novo perfil serão aplicadas imediatamente.
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditRoleUser(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={isRoleSaving || editRoleValue === editRoleUser?.role}
              >
                {isRoleSaving ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar Usuário */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados e defina a senha de acesso do colaborador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
            <FormField label="Nome completo">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: João Silva" required />
            </FormField>
            <FormField label="E-mail">
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="joao@autovitrais.com.br" required />
            </FormField>
            <FormField label="Senha">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Perfil">
                <Select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                  <option value="ATENDENTE">ATENDENTE</option>
                  <option value="ESTOQUISTA">ESTOQUISTA</option>
                  <option value="GERENTE">GERENTE</option>
                  <option value="ADMIN">ADMIN</option>
                </Select>
              </FormField>
              <FormField label="Loja padrão">
                <Select value={newStoreId} onChange={(e) => setNewStoreId(e.target.value)}>
                  {mockStores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>

            {createError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{createError}</p>
            )}
            <Button type="submit" className="w-full py-6" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Usuário"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Senha temporária */}
      {tempPassword && (
        <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
          <DialogContent className="max-w-sm text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <Shield className="size-8 text-emerald-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Usuário criado com sucesso!</DialogTitle>
              <DialogDescription>
                Passe a senha temporária abaixo para o colaborador.
              </DialogDescription>
            </DialogHeader>
            <div className="my-6 rounded-2xl bg-slate-100 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Senha Temporária</p>
              <p className="mt-2 text-3xl font-bold tracking-widest text-slate-900">{tempPassword}</p>
            </div>
            <Button onClick={() => setTempPassword(null)} className="w-full">
              Copiar e Fechar
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
