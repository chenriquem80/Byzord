import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, Search, UserMinus, UserCheck, Shield, ShieldCheck, KeyRound, UserCog } from "lucide-react";
import { supabase, supabaseAdmin } from "@/lib/database";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  SIDEBAR_PAGES,
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
  const [dbStores, setDbStores] = useState<{ id: string; name: string }[]>([]);
  const [_loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number; user: User | null }>({ visible: false, x: 0, y: 0, user: null });
  const ctxRef = useRef<HTMLDivElement>(null);

  // Edição completa do usuário
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("ATENDENTE");
  const [editStoreId, setEditStoreId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    if (supabase) {
      supabase.from("stores").select("id, name").then(({ data }) => { if (data) setDbStores(data); });
    } else {
      setDbStores(mockStores.map((s) => ({ id: s.id, name: s.name })));
    }
  }, []);

  // Fecha menu de contexto ao clicar fora
  useEffect(() => {
    if (!ctxMenu.visible) return;
    function close() { setCtxMenu((m) => ({ ...m, visible: false })); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [ctxMenu.visible]);

  function openCtxMenu(e: React.MouseEvent, user: User) {
    e.preventDefault();
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, user });
  }

  function openEdit(user: User) {
    setEditUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditStoreId(user.storeId ?? dbStores[0]?.id ?? "");
    setEditError(null);
    setCtxMenu((m) => ({ ...m, visible: false }));
  }

  async function handleSaveEdit() {
    if (!editUser || !supabase) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const { error } = await supabase.from("profiles").update({
        name: editName.trim(),
        role: editRole,
        store_id: editStoreId || null,
        allow_cost_view: editRole === "ADMIN" || editRole === "GERENTE",
      }).eq("id", editUser.id);
      if (error) throw error;
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message ?? "Erro ao salvar.");
    } finally {
      setEditSaving(false);
    }
  }

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

  function UserTable({ data }: { data: User[] }) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Usuário", "Perfil", "Loja", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">Nenhum usuário encontrado.</td></tr>
            )}
            {data.map((u) => (
              <tr
                key={u.id}
                onContextMenu={(e) => openCtxMenu(e, u)}
                className="hover:bg-slate-50 cursor-context-menu select-none"
                title="Clique com o botão direito para editar"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <button type="button" onClick={() => openEditRole(u)} title="Clique para alterar o perfil" className="group">
                      <Badge className="bg-slate-100 font-medium transition-colors group-hover:bg-blue-100 group-hover:text-blue-700 cursor-pointer">
                        <UserCog className="mr-1 size-3 opacity-0 group-hover:opacity-100" />
                        {u.role}
                      </Badge>
                    </button>
                  ) : (
                    <Badge className="bg-slate-100 font-medium">{u.role}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{u.storeName}</td>
                <td className="px-4 py-3">
                  <Badge className={(u as any).status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                    {(u as any).status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(u)} title="Editar usuário"
                      className="flex size-9 items-center justify-center rounded-lg border border-border text-slate-500 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => openPermissions(u)} title="Editar permissões"
                      className="flex size-9 items-center justify-center rounded-lg border border-border text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <ShieldCheck className="size-4" />
                    </button>
                    <button type="button" onClick={() => toggleUserStatus(u)}
                      title={(u as any).status === "ativo" ? "Desativar usuário" : "Ativar usuário"}
                      className="flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-rose-300 hover:bg-rose-50">
                      {(u as any).status === "ativo"
                        ? <UserMinus className="size-4 text-rose-500" />
                        : <UserCheck className="size-4 text-emerald-500" />}
                    </button>
                    <button type="button" onClick={() => forcePasswordChange(u)}
                      title={(u as any).mustChangePassword ? "Troca de senha já solicitada" : "Solicitar troca de senha"}
                      className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${(u as any).mustChangePassword ? "border-amber-300 bg-amber-50" : "border-border hover:border-amber-300 hover:bg-amber-50"}`}>
                      <KeyRound className={`size-4 ${(u as any).mustChangePassword ? "text-amber-500" : "text-slate-500"}`} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

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
          <UserTable data={filteredUsers} />
          <p className="mt-2 text-xs text-slate-400">{filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""} • Clique com o botão direito em uma linha para editar</p>
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
            {SIDEBAR_PAGES.map((page) => (
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

      {/* Context menu — botão direito na linha */}
      {ctxMenu.visible && ctxMenu.user && createPortal(
        <div
          ref={ctxRef}
          className="fixed z-[9999] min-w-[200px] overflow-hidden rounded-xl border border-border bg-white shadow-lg"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-4 py-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</p>
            <p className="text-sm font-semibold text-slate-900">{ctxMenu.user.name}</p>
          </div>
          <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => openEdit(ctxMenu.user!)}>
            <Pencil className="size-4" /> Editar dados
          </button>
          <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50"
            onClick={() => { openPermissions(ctxMenu.user!); setCtxMenu((m) => ({ ...m, visible: false })); }}>
            <ShieldCheck className="size-4" /> Permissões
          </button>
          <button type="button"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"
            onClick={() => { toggleUserStatus(ctxMenu.user!); setCtxMenu((m) => ({ ...m, visible: false })); }}>
            {(ctxMenu.user as any).status === "ativo"
              ? <><UserMinus className="size-4 text-rose-500" /><span className="text-rose-600">Desativar</span></>
              : <><UserCheck className="size-4 text-emerald-500" /><span className="text-emerald-600">Ativar</span></>}
          </button>
          <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50"
            onClick={() => { forcePasswordChange(ctxMenu.user!); setCtxMenu((m) => ({ ...m, visible: false })); }}>
            <KeyRound className="size-4" /> Solicitar troca de senha
          </button>
        </div>,
        document.body
      )}

      {/* Modal: Editar Usuário */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Altere os dados de <strong>{editUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <FormField label="Nome">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome completo" />
            </FormField>
            <FormField label="Perfil">
              <Select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}>
                <option value="ATENDENTE">ATENDENTE</option>
                <option value="ESTOQUISTA">ESTOQUISTA</option>
                <option value="GERENTE">GERENTE</option>
                <option value="ADMIN">ADMIN</option>
              </Select>
            </FormField>
            <FormField label="Loja">
              <Select value={editStoreId} onChange={(e) => setEditStoreId(e.target.value)}>
                <option value="">Sem loja</option>
                {dbStores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
            {editError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{editError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={editSaving || !editName.trim()}>
                {editSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
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
