import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    if (!supabase) {
      setMessage({ type: "error", text: "Supabase não configurado." });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/change-password`,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "E-mail de recuperação enviado! Verifique sua caixa de entrada.",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Erro ao solicitar recuperação de senha.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-[32px] bg-white p-10 shadow-panel">
        <h1 className="text-2xl font-bold text-slate-900">Recuperar Senha</h1>
        <p className="mt-2 text-slate-500">
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <FormField label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </FormField>

          {message && (
            <p className={`rounded-xl p-3 text-sm ${
              message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
            }`}>
              {message.text}
            </p>
          )}

          <div className="space-y-3">
            <Button type="submit" className="w-full py-6" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            
            <Link to="/login" className="block text-center text-sm font-medium text-slate-500 hover:text-primary">
              Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
