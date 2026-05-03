import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/contexts/auth-context";

export function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) throw authError;

      // Update profile flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      navigate("/app", { replace: true });
    } catch (err: any) {
      setError(err.message || "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-[32px] bg-white p-10 shadow-panel">
        <h1 className="text-2xl font-bold text-slate-900">Trocar Senha</h1>
        <p className="mt-2 text-slate-500">
          Esta é sua primeira vez no sistema ou sua senha foi resetada. Por favor, crie uma nova senha segura.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <FormField label="Nova senha">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </FormField>

          <FormField label="Confirmar nova senha">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </FormField>

          {error && (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full py-6" disabled={loading}>
            {loading ? "Alterando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
