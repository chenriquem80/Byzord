import { SectionCard } from "@/components/shared/section-card";
import { Card, CardContent } from "@/components/ui/card";

const reports = [
  "Estoque atual",
  "Produtos zerados",
  "Estoque baixo",
  "Valor total em estoque por custo",
  "Valor total em estoque por venda",
  "Margem por produto",
  "Histórico de custo",
  "Última data de compra por produto",
  "Produtos mais vendidos",
  "Produtos parados",
  "Compatibilidade por veículo",
  "Vendas por período",
];

export function ReportsPage() {
  return (
    <div className="space-y-6">
            <SectionCard title="Catálogo de relatórios" description="Organizado para o financeiro e a gestão do estoque.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <Card key={report}>
              <CardContent className="p-5">
                <p className="font-semibold text-slate-900">{report}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Pronto para exportação e consulta por filtro.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

