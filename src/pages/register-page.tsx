import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { supabase } from "@/lib/database";
import { Select } from "@/components/ui/select";
import { stores as mockStores } from "@/data/mock-data";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Erro: Supabase não está configurado. Verifique o arquivo .env");
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        // 2. The trigger 'on_auth_user_created' in schema.sql will handle profile creation
        // But we want to ensure it's an ADMIN for this first setup
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role: "ADMIN", must_change_password: false })
          .eq("id", data.user.id);

        if (profileError) {
          console.warn("Trigger may not have finished yet, retrying profile update...");
          // Simple retry logic or wait
        }
      }

      alert("Conta criada com sucesso! Verifique seu e-mail para confirmar o acesso e depois faça o login.");
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-[32px] bg-white p-10 shadow-panel">
        <h1 className="text-2xl font-bold text-slate-900">Configuração Inicial</h1>
        <p className="mt-2 text-slate-500">
          Crie sua conta de Administrador para começar a gerenciar o sistema.
        </p>

        <form onSubmit={handleRegister} className="mt-8 space-y-6">
          <FormField label="Nome completo">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Henrique"
              required
            />
          </FormField>

          <FormField label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </FormField>

          <FormField label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </FormField>

          {error && (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <Button type="submit" className="w-full py-6" disabled={loading}>
              {loading ? "Criando..." : "Criar Conta Admin"}
            </Button>
            
            <Link to="/login" className="block text-center text-sm font-medium text-slate-500 hover:text-primary">
              Já tenho uma conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
