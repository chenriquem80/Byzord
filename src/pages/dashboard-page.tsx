import { AlertTriangle, PackageMinus, PackagePlus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIcon } from "@/components/shared/icon-map";
import { supabase } from "@/lib/database";

const mobileNavItems = [
  { title: "Novo Atendimento", route: "/app/atendimento", icon: "ClipboardList", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  { title: "Consulta de Atendimento", route: "/app/atendimento-consulta", icon: "Search", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  { title: "Orçamento", route: "/app/orcamento", icon: "Calculator", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  { title: "Consulta de Estoque", route: "/app/estoque", icon: "Package", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  { title: "Entrada de Estoque", route: "/app/entrada", icon: "PackagePlus", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
  { title: "Saída de Estoque", route: "/app/saida", icon: "ShoppingCart", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
];

type StockMovement = {
  id: string;
  type: string;
  product_name: string;
  store_name: string;
  manufacturer: string;
  user_name: string;
  quantity: number;
  note: string | null;
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

type DbStore = { id: string; name: string; city: string };

function isTodayLocal(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function DashboardPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);
  const [dbStores, setDbStores] = useState<DbStore[]>([]);

  async function fetchMovements() {
    setLoadingMovements(true);
    if (!supabase) { setLoadingMovements(false); return; }
    // Busca últimas 48h para cobrir fuso horário e filtra por data local no cliente
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("stock_movements")
      .select("id, type, product_name, store_name, manufacturer, user_name, quantity, note, created_at")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false });
    if (error) { console.error("stock_movements:", error.message); }
    const todayOnly = (data ?? []).filter((m) => m.created_at && isTodayLocal(m.created_at));
    setMovements(todayOnly);
    setLoadingMovements(false);
  }

  async function fetchLowStock() {
    setLoadingLowStock(true);
    if (!supabase) { setLoadingLowStock(false); return; }
    const [{ data: storesData }, { data }] = await Promise.all([
      supabase.from("stores").select("id, name, city"),
      supabase
        .from("product_store_inventory")
        .select("id, stock, min_quantity, store_id, product_manufacturers(manufacturer, products(name)), stores(name)")
        .gt("min_quantity", 0),
    ]);
    if (storesData) setDbStores(storesData);
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

  function refresh() { fetchMovements(); fetchLowStock(); }

  useEffect(() => { fetchMovements(); fetchLowStock(); }, []);

  const entries = movements.filter((m) => m.type === "Entrada" || m.type === "entrada");
  const exits   = movements.filter((m) => m.type === "Saída" || m.type === "saida" || m.type === "Saida");

  return (
    <div className="space-y-6">
      {/* Atalhos de navegação — apenas mobile */}
      <div className="grid w-full grid-cols-2 gap-2 lg:hidden">
        {mobileNavItems.map((item) => {
          const Icon = getIcon(item.icon);
          return (
            <Link
              key={item.route}
              to={item.route}
              className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border p-3 ${item.bg} ${item.border} transition active:opacity-75`}
            >
              <div className="shrink-0 rounded-xl bg-white/60 p-2">
                <Icon className={`size-5 ${item.text}`} />
              </div>
              <span className={`min-w-0 text-sm font-semibold leading-tight ${item.text}`}>{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Resumo por loja */}
      <div className="hidden lg:block">
        <SectionCard
          title="Resumo por loja"
          description="Visual rápido para comparar o saldo operacional entre as unidades."
          action={
            <Button size="sm" variant="outline" onClick={refresh} disabled={loadingMovements || loadingLowStock}>
              <RefreshCw className={`size-3.5 ${(loadingMovements || loadingLowStock) ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {dbStores.map((store) => {
              const entryCount = entries.filter((m) => m.store_name === store.name).length;
              const exitCount  = exits.filter((m) => m.store_name === store.name).length;
              const lowCount   = lowStock.filter((item) => item.store_name === store.name).length;
              return (
                <div key={store.id} className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-lg font-semibold text-slate-900">{store.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{(store as any).city ?? ""}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-violet-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-violet-600">Entradas hoje</p>
                      <p className="mt-2 text-2xl font-bold text-violet-700">{entryCount}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-amber-600">Saídas hoje</p>
                      <p className="mt-2 text-2xl font-bold text-amber-700">{exitCount}</p>
                    </div>
                    <div className={`rounded-2xl p-4 ${lowCount > 0 ? "bg-rose-50" : "bg-slate-50"}`}>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Abaixo mínimo</p>
                      <p className={`mt-2 text-2xl font-bold ${lowCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{lowCount}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Movimentações do dia */}
        <SectionCard
          title="Movimentações do dia"
          description={`${movements.length} movimentação${movements.length !== 1 ? "ões" : ""} registrada${movements.length !== 1 ? "s" : ""} hoje — ${entries.length} entrada${entries.length !== 1 ? "s" : ""}, ${exits.length} saída${exits.length !== 1 ? "s" : ""}.`}
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
            ) : movements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhuma movimentação registrada hoje.</p>
            ) : (
              movements.map((item) => {
                const isEntry = item.type === "Entrada";
                return (
                  <div key={item.id} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${isEntry ? "border-violet-100 bg-violet-50/40" : "border-amber-100 bg-amber-50/40"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 rounded-xl p-2 ${isEntry ? "bg-violet-100" : "bg-amber-100"}`}>
                        {isEntry
                          ? <PackagePlus className="size-4 text-violet-600" />
                          : <PackageMinus className="size-4 text-amber-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.product_name}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {item.store_name} • {item.manufacturer}
                          {item.user_name ? ` • ${item.user_name}` : ""}
                        </p>
                        {item.note && <p className="mt-0.5 text-xs text-slate-400">{item.note}</p>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className={isEntry ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}>
                        {isEntry ? "+" : ""}{Math.abs(item.quantity)} un.
                      </Badge>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        {/* Estoque abaixo do mínimo */}
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
