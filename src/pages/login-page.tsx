import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/database";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Erro: Supabase não está configurado. Verifique o arquivo .env");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      navigate("/app");
    } catch (err: any) {
      console.error("Erro de login:", err);
      if (err.message === "Invalid login credentials") {
        setError("E-mail ou senha incorretos.");
      } else if (err.message === "Email not confirmed") {
        setError("Por favor, confirme seu e-mail antes de entrar (verifique sua caixa de entrada).");
      } else {
        setError(err.message || "Erro ao entrar no sistema. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-panel lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-[#74777F] p-8 text-white md:p-12">
          <div className="rounded-[32px] bg-white p-6">
            <img
              src="/logo.png"
              alt="Byzord Auto Vitrais"
              className="mx-auto w-full max-w-[280px] object-contain"
            />
          </div>
          <div className="mt-8 space-y-4">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-200">Login</p>
            <h1 className="text-4xl font-bold text-white md:text-5xl">Byzord Auto Vitrais</h1>
            <p className="max-w-lg text-base leading-8 text-slate-100 md:text-lg">
              Acesse o sistema para atendimento, estoque, entrada, separação e gestão das lojas Taubaté e Pinda.
            </p>
          </div>
        </div>

        <div className="flex items-center p-8 md:p-12">
          <form onSubmit={handleLogin} className="mx-auto w-full max-w-xl space-y-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                Entrar no sistema
              </p>
              <h2 className="mt-3 text-4xl font-bold text-slate-950">Bem-vindo</h2>
              <p className="mt-2 text-base text-slate-500">
                Use seu acesso para entrar no painel operacional.
              </p>
            </div>

            <div className="grid gap-5">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">E-mail</p>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  required
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Senha</p>
                  <Link to="/forgot-password" size="sm" className="text-xs text-primary hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <Button
                type="submit"
                size="lg"
                className="h-14 w-full rounded-2xl"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center">
                <Link to="/register" className="text-sm font-medium text-slate-500 hover:text-primary">
                  Primeiro acesso? Crie sua conta admin
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

