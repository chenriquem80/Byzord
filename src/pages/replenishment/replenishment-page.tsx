import { AlertTriangle, Boxes, Clock3, TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Card, CardContent } from "@/components/ui/card";
import { products } from "@/data/mock-data";

const cards = [
  {
    icon: AlertTriangle,
    title: "Estoque abaixo do mínimo",
    text: "Produtos com saldo menor que o mínimo configurado.",
    highlight: "8 itens",
  },
  {
    icon: Boxes,
    title: "Produtos zerados",
    text: "Itens que bloqueiam venda e precisam de compra imediata.",
    highlight: "4 itens",
  },
  {
    icon: TrendingUp,
    title: "Alto giro",
    text: "Produtos que pedem reposição rápida pelo volume de saída.",
    highlight: "6 itens",
  },
  {
    icon: Clock3,
    title: "Sem compra recente",
    text: "Itens sem atualização de custo ou compra recente.",
    highlight: "9 itens",
  },
];

export function ReplenishmentPage() {
  return (
    <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.title}>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <item.icon className="size-5" />
                </div>
                <p className="text-lg font-bold text-slate-950">{item.highlight}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionCard title="Itens críticos" description="Base para gerar pedidos de compra a partir da análise de giro.">
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">
                    Saldo atual {product.manufacturers.reduce((sum, item) => sum + item.inventories.reduce((storeSum, inventory) => storeSum + inventory.stock, 0), 0)} •
                    {" "}
                    {product.manufacturers
                      .flatMap((item) => item.inventories)
                      .map((inventory) => `${inventory.storeName}: min ${inventory.minQuantity}`)
                      .join(" • ")}
                  </p>
                </div>
                <p className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                  Repor
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

