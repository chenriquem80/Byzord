import { useEffect, useState } from "react";
import { Plus, Search, UserMinus, UserCheck, Shield } from "lucide-react";
import { supabase } from "@/lib/database";
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
import { stores as mockStores } from "@/data/mock-data";

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [_loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Form states
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
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
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          stores (name)
        `);

      if (error) throw error;

      if (data) {
        setUsers(data.map(item => ({
          id: item.id,
          name: item.name,
          email: item.email,
          role: item.role as UserRole,
          storeId: item.store_id,
          storeName: item.stores?.name ?? "Sem loja",
          allowCostView: item.allow_cost_view,
          status: item.status,
          mustChangePassword: item.must_change_password
        })));
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoading(true);
      // For demo purposes, if supabase fails/null, we can use empty or mock
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
    // In a real app, we'd use a Supabase Edge Function or a backend to create the auth user
    // Since we are in a demo/prototype, we'll simulate it or use signup if allowed.
    // For this implementation, I'll show how it would be done.
    
    const generatedPassword = Math.random().toString(36).slice(-8);
    setTempPassword(generatedPassword);
    
    // Simulating creation logic
    alert(`Usuário criado! Senha temporária: ${generatedPassword}\n(Em produção, isso usaria uma Edge Function para criar o usuário no auth.users)`);
    
    setIsCreateModalOpen(false);
    fetchUsers();
  }

  async function toggleUserStatus(user: User) {
    if (!supabase) return;
    const newStatus = (user as any).status === "ativo" ? "inativo" : "ativo";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);
      
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

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
      cell: ({ row }: any) => (
        <Badge className="bg-slate-100 font-medium">
          {row.original.role}
        </Badge>
      ),
    },
    {
      header: "Loja",
      accessorKey: "storeName",
    },
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
            onClick={() => toggleUserStatus(row.original)}
            className="size-9 p-0"
          >
            {row.original.status === "ativo" ? <UserMinus className="size-4 text-rose-500" /> : <UserCheck className="size-4 text-emerald-500" />}
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

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo acesso para a plataforma. Uma senha temporária será gerada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
            <FormField label="Nome completo">
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="Ex: João Silva" 
                required
              />
            </FormField>
            <FormField label="E-mail">
              <Input 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="joao@autovitrais.com.br" 
                required
              />
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

            <Button type="submit" className="w-full py-6">
              Criar Usuário e Gerar Senha
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
