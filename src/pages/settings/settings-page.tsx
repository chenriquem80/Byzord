import { LockKeyhole, ShieldCheck, Wallet } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Card, CardContent } from "@/components/ui/card";

const permissions = [
  {
    title: "Administrador",
    description: "Gerencia custo, permissões, logs e parâmetros críticos.",
    icon: ShieldCheck,
  },
  {
    title: "Vendedor",
    description: "Opera busca, saída e cadastro básico sem ver custo por padrão.",
    icon: LockKeyhole,
  },
  {
    title: "Estoquista / Financeiro",
    description: "Lançamentos de entrada, ajustes, auditoria e relatórios financeiros.",
    icon: Wallet,
  },
];

export function SettingsPage() {
  return (
    <div className="space-y-6">
            <SectionCard title="Perfis e regras" description="Regras desenhadas para o dia a dia da loja.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {permissions.map((permission) => (
            <Card key={permission.title}>
              <CardContent className="space-y-4 p-6">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <permission.icon className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{permission.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{permission.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Regras de negócio consideradas" description="Estrutura pronta para logs e políticas de acesso.">
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p>Toda alteração gera log.</p>
          <p>Somente administrador altera custo.</p>
          <p>Vendedor pode ser impedido de ver custo salvo permissão adicional.</p>
          <p>Venda considera estoque por fabricante e bloqueia sem saldo.</p>
        </div>
      </SectionCard>
    </div>
  );
}

