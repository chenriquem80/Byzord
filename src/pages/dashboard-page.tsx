import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIcon } from "@/components/shared/icon-map";
import { stores } from "@/data/mock-data";
import { supabase } from "@/lib/database";

const mobileNavItems = [
  { title: "Novo Atendimento", route: "/app/atendimento", icon: "ClipboardList", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  { title: "Consulta de Atendimento", route: "/app/atendimento-consulta", icon: "Search", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  { title: "Orçamento", route: "/app/orcamento", icon: "Calculator", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  { title: "Consulta de Estoque", route: "/app/estoque", icon: "Package", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  { title: "Entrada de Estoque", route: "/app/entrada", icon: "PackagePlus", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
  { title: "Saída de Estoque", route: "/app/saida", icon: "ShoppingCart", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
];

type AttendanceRecord = {
  id: string;
  plate: string;
  store_name: string | null;
  service_title: string | null;
  billing_type: string | null;
  executing_employee: string | null;
  status: string;
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

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColor: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-slate-100 text-slate-500",
};

export function DashboardPage() {
  const [todayAttendances, setTodayAttendances] = useState<AttendanceRecord[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  async function fetchTodayAttendances() {
    setLoadingAttendances(true);
    if (!supabase) { setLoadingAttendances(false); return; }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("pending_attendances")
      .select("id, plate, store_name, service_title, billing_type, executing_employee, status, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    setTodayAttendances(data ?? []);
    setLoadingAttendances(false);
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
    fetchTodayAttendances();
    fetchLowStock();
  }, []);

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

      <div className="hidden lg:block">
        <SectionCard
          title="Resumo por loja"
          description="Visual rápido para comparar o saldo operacional entre as unidades."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {stores.map((store) => {
              const attendCount = todayAttendances.filter((a) => a.store_name === store.name).length;
              const lowCount = lowStock.filter((item) => item.store_name === store.name).length;
              return (
                <div key={store.id} className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-lg font-semibold text-slate-900">{store.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{store.city}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Atendimentos hoje</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{attendCount}</p>
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
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          title="Atendimentos do dia"
          description={`${todayAttendances.length} atendimento${todayAttendances.length !== 1 ? "s" : ""} registrado${todayAttendances.length !== 1 ? "s" : ""} hoje.`}
          action={
            <Button size="sm" variant="outline" onClick={fetchTodayAttendances} disabled={loadingAttendances}>
              <RefreshCw className={`size-3.5 ${loadingAttendances ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        >
          <div className="space-y-3">
            {loadingAttendances ? (
              <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>
            ) : todayAttendances.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhum atendimento registrado hoje.</p>
            ) : (
              todayAttendances.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tracking-wider text-slate-900">{item.plate}</span>
                      <Badge className={statusColor[item.status] ?? "bg-slate-100 text-slate-600"}>
                        {statusLabel[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {item.store_name ? ` · ${item.store_name}` : ""}
                      {item.executing_employee ? ` · ${item.executing_employee}` : ""}
                    </p>
                    {item.service_title && (
                      <p className="mt-0.5 text-sm text-slate-700">{item.service_title}{item.billing_type ? ` · ${item.billing_type}` : ""}</p>
                    )}
                  </div>
                </div>
              ))
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
