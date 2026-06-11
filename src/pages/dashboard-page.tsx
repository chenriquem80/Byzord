import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stores } from "@/data/mock-data";
import { supabase } from "@/lib/database";

type Movement = {
  id: string;
  type: string;
  product_name: string;
  store_name: string;
  manufacturer: string | null;
  user_name: string | null;
  quantity: number;
  note: string | null;
  special_condition: string | null;
  created_at: string;
};

type LowStockItem = {
  id: string;
  product_name: string;
  store_name: string;
  manufacturer: string;
  stock: number;
  min_quantity: number;
};

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  async function fetchMovements() {
    setLoadingMovements(true);
    if (!supabase) { setLoadingMovements(false); return; }
    const { data } = await supabase
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements(data ?? []);
    setLoadingMovements(false);
  }

  async function fetchLowStock() {
    setLoadingLowStock(true);
    if (!supabase) { setLoadingLowStock(false); return; }
    const { data } = await supabase
      .from("product_store_inventory")
      .select("id, stock, min_quantity, store_id, product_manufacturers(manufacturer, products(name)), stores(name)")
      .gt("min_quantity", 0);

    const mapped: LowStockItem[] = (data ?? [])
      .filter((row: any) => (row.stock ?? 0) < (row.min_quantity ?? 0))
      .map((row: any) => ({
        id: row.id,
        product_name: row.product_manufacturers?.products?.name ?? "—",
        store_name: row.stores?.name ?? "—",
        manufacturer: row.product_manufacturers?.manufacturer ?? "—",
        stock: row.stock ?? 0,
        min_quantity: row.min_quantity ?? 0,
      }));
    setLowStock(mapped);
    setLoadingLowStock(false);
  }

  useEffect(() => {
    fetchMovements();
    fetchLowStock();
  }, []);

  const filteredMovements = useMemo(() => {
    if (!selectedDate) return movements;
    return movements.filter((item) => {
      const localDate = new Date(item.created_at).toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });
      const [d, m, y] = localDate.split("/");
      return `${y}-${m}-${d}` === selectedDate;
    });
  }, [selectedDate, movements]);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Resumo por loja"
        description="Visual rápido para comparar o saldo operacional entre as unidades."
        action={
          <div className="w-full md:w-52">
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map((store) => {
            const movementsCount = filteredMovements.filter((item) => item.store_name === store.name).length;
            const lowCount = lowStock.filter((item) => item.store_name === store.name).length;
            return (
              <div key={store.id} className="rounded-2xl border border-border bg-white p-5">
                <p className="text-lg font-semibold text-slate-900">{store.name}</p>
                <p className="mt-1 text-sm text-slate-500">{store.city}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Movimentações</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{movementsCount}</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${lowCount > 0 ? "bg-rose-50" : "bg-slate-50"}`}>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Abaixo do mínimo</p>
                    <p className={`mt-2 text-2xl font-bold ${lowCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{lowCount}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          title="Movimentações recentes"
          description="Últimos registros de entrada, saída e ajustes com responsável."
          action={
            <Button size="sm" variant="outline" onClick={fetchMovements} disabled={loadingMovements}>
              <RefreshCw className={`size-3.5 ${loadingMovements ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        >
          <div className="space-y-3">
            {loadingMovements ? (
              <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>
            ) : filteredMovements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Nenhuma movimentação nesta data.{" "}
                <span className="block mt-1 text-xs text-slate-300">
                  Certifique-se que a tabela stock_movements foi criada no Supabase.
                </span>
              </p>
            ) : (
              filteredMovements.map((item) => {
                const typeColor =
                  item.type === "Entrada" ? "bg-emerald-100 text-emerald-700" :
                  item.type === "Saída" ? "bg-rose-100 text-rose-700" :
                  "bg-blue-100 text-blue-700";
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${typeColor}`}>{item.type}</span>
                        {item.special_condition && (
                          <span className="shrink-0 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                            {item.special_condition}
                          </span>
                        )}
                        <p className="truncate font-semibold text-slate-900">{item.product_name}</p>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {item.store_name}{item.manufacturer ? ` • ${item.manufacturer}` : ""}{item.user_name ? ` • ${item.user_name}` : ""} • {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-left md:text-right shrink-0">
                      <p className={`font-semibold ${item.quantity < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {item.quantity > 0 ? "+" : ""}{item.quantity} un.
                      </p>
                      {item.note && <p className="text-sm text-slate-400">{item.note}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Estoque abaixo do mínimo"
          description="Itens com quantidade atual menor que o mínimo indicado."
          action={
            <Button size="sm" variant="outline" onClick={fetchLowStock} disabled={loadingLowStock}>
              <RefreshCw className={`size-3.5 ${loadingLowStock ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        >
          <div className="space-y-3">
            {loadingLowStock ? (
              <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>
            ) : lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhum item abaixo do mínimo.</p>
            ) : (
              lowStock.map((item) => (
                <div key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.product_name}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{item.store_name} • {item.manufacturer}</p>
                    </div>
                    <Badge className="shrink-0 bg-rose-100 text-rose-700">
                      <AlertTriangle className="mr-1 size-3.5" />
                      {item.stock}/{item.min_quantity} un.
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>


    </div>
  );
}
