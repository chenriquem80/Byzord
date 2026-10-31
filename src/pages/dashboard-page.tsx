import { PackageMinus, PackagePlus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/database";
import { useAuth } from "@/contexts/auth-context";
import { canAccessPage, type AppPage } from "@/lib/permissions";

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
  const { user } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [dbStores, setDbStores] = useState<DbStore[]>([]);
  const [agendaItems, setAgendaItems] = useState<{ id: string; description: string; user_name: string | null }[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

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

  async function fetchStores() {
    if (!supabase) return;
    const { data } = await supabase.from("stores").select("id, name, city");
    if (data) setDbStores(data);
  }

  async function fetchAgenda() {
    setLoadingAgenda(true);
    if (!supabase) { setLoadingAgenda(false); return; }
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const { data } = await supabase
      .from("agenda")
      .select("id, description, user_name")
      .eq("event_date", iso)
      .order("created_at", { ascending: false });
    setAgendaItems(data ?? []);
    setLoadingAgenda(false);
  }

  function refresh() { fetchMovements(); fetchAgenda(); }

  useEffect(() => {
    fetchMovements();
    fetchStores();
    fetchAgenda();
    const interval = setInterval(() => { fetchMovements(); fetchAgenda(); }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const entries = movements.filter((m) => m.type === "Entrada" || m.type === "entrada");
  const exits   = movements.filter((m) => m.type === "Saída" || m.type === "saida" || m.type === "Saida");

  return (
    <div className="space-y-6">
      {/* Atalhos de navegação — apenas mobile */}
      <div className="grid w-full grid-cols-2 gap-2 lg:hidden">
        {mobileNavItems.filter((item) => user && canAccessPage(user, item.route as AppPage)).map((item) => (
          <Link
            key={item.route}
            to={item.route}
            className={`flex min-w-0 items-center justify-center overflow-hidden rounded-2xl border p-4 ${item.bg} ${item.border} transition active:opacity-75`}
          >
            <span className={`min-w-0 text-center text-sm font-semibold leading-tight ${item.text}`}>{item.title}</span>
          </Link>
        ))}
      </div>

      {/* Resumo por loja */}
      <div className="hidden lg:block">
        <SectionCard
          title="Resumo por loja"
          description="Visual rápido para comparar o saldo operacional entre as unidades."
          action={
            <Button size="sm" variant="outline" onClick={refresh} disabled={loadingMovements}>
              <RefreshCw className={`size-3.5 ${loadingMovements ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {dbStores.map((store) => {
              const entryCount = entries.filter((m) => m.store_name === store.name).length;
              const exitCount  = exits.filter((m) => m.store_name === store.name).length;
              return (
                <div key={store.id} className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-lg font-semibold text-slate-900">{store.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{(store as any).city ?? ""}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-violet-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-violet-600">Entradas hoje</p>
                      <p className="mt-2 text-2xl font-bold text-violet-700">{entryCount}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-amber-600">Saídas hoje</p>
                      <p className="mt-2 text-2xl font-bold text-amber-700">{exitCount}</p>
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

        {/* Agenda do dia */}
        <SectionCard
          title="Agenda do dia"
          description={`${agendaItems.length} registro${agendaItems.length !== 1 ? "s" : ""} hoje.`}
          action={
            <Button size="sm" variant="outline" onClick={fetchAgenda} disabled={loadingAgenda}>
              <RefreshCw className={`size-3.5 ${loadingAgenda ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        >
          <div className="space-y-3">
            {loadingAgenda ? (
              <p className="py-6 text-center text-sm text-slate-400">Carregando...</p>
            ) : agendaItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nenhum registro na agenda hoje.</p>
            ) : (
              agendaItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{item.description}</p>
                  {item.user_name && (
                    <p className="mt-2 text-xs text-slate-400">{item.user_name}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
