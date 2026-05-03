import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { currentUser, stores } from "@/data/mock-data";

export function LoginPage() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState(currentUser.storeId);

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
          <div className="mx-auto w-full max-w-xl space-y-8">
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
                <p className="mb-2 text-sm font-medium text-slate-700">Usuário</p>
                <Input defaultValue={currentUser.name} placeholder="Digite seu usuário" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Senha</p>
                <Input type="password" defaultValue="123456" placeholder="Digite sua senha" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Loja</p>
                <Select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                size="lg"
                className="h-14 w-full rounded-2xl"
                onClick={() => navigate("/app")}
              >
                Entrar
              </Button>
              <p className="text-center text-sm text-slate-500">
                Ambiente demonstrativo com fluxo de login e acesso ao painel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

