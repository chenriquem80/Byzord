import { useEffect, useMemo, useState } from "react";
import { FileDown, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/database";
import { addDays, brl, fmtDate, parts, todayIso } from "@/lib/finance";

type Bill = {
  id: string;
  supplier: string;
  description: string | null;
  amount: number;
  due_date: string;
  store_id: string | null;
};

type Store = { id: string; name: string };
type Scope = "a_vencer" | "vencidos" | "todos_abertos";

const MISSING_TABLE = /relation .* does not exist|Could not find the table|42P01|PGRST205/i;

const SCOPE_LABELS: Record<Scope, string> = {
  a_vencer: "A vencer",
  vencidos: "Vencidos",
  todos_abertos: "Em aberto (a vencer + vencidos)",
};

/** Dias entre hoje e o vencimento (negativo = vencido). */
function daysUntil(due: string, today: string): number {
  const [y1, m1, d1] = parts(today);
  const [y2, m2, d2] = parts(due);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

function daysLabel(days: number): string {
  if (days === 0) return "vence hoje";
  if (days > 0) return `em ${days} dia${days > 1 ? "s" : ""}`;
  return `vencido há ${-days} dia${days < -1 ? "s" : ""}`;
}

export function BillsReportPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const ownStore = user?.storeId ?? "";
  const today = todayIso();

  const [stores, setStores] = useState<Store[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<Scope>("a_vencer");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(addDays(today, 30));
  const [storeId, setStoreId] = useState(isAdmin || !ownStore ? "all" : ownStore);
  const [supplierFilter, setSupplierFilter] = useState("");

  useEffect(() => {
    supabase?.from("stores").select("id, name").order("name").then(({ data }) => setStores(data ?? []));
  }, []);

  // Ao trocar o tipo, ajusta o período padrão
  function changeScope(next: Scope) {
    setScope(next);
    if (next === "a_vencer") { setDateFrom(today); setDateTo(addDays(today, 30)); }
    else { setDateFrom(""); setDateTo(next === "vencidos" ? addDays(today, -1) : addDays(today, 30)); }
  }

  async function fetchReport() {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    let q = supabase.from("bills")
      .select("id, supplier, description, amount, due_date, store_id")
      .eq("status", "aberto")
      .order("due_date");
    if (scope === "a_vencer") q = q.gte("due_date", dateFrom && dateFrom > today ? dateFrom : today);
    else if (dateFrom) q = q.gte("due_date", dateFrom);
    if (scope === "vencidos") q = q.lt("due_date", dateTo && dateTo < today ? addDays(dateTo, 1) : today);
    else if (dateTo) q = q.lte("due_date", dateTo);
    if (storeId !== "all") q = q.eq("store_id", storeId);
    const { data, error: err } = await q;
    setLoading(false);
    if (err) {
      setError(MISSING_TABLE.test(err.message) ? "As tabelas do Financeiro ainda não foram criadas no banco de dados." : `Erro ao consultar: ${err.message}`);
      return;
    }
    setBills((data ?? []).map((b: any) => ({ ...b, amount: Number(b.amount) })));
    setSupplierFilter("");
    setFetched(true);
  }

  const suppliers = useMemo(() => [...new Set(bills.map((b) => b.supplier))].sort((a, b) => a.localeCompare(b, "pt-BR")), [bills]);
  const visible = useMemo(() => bills.filter((b) => !supplierFilter || b.supplier === supplierFilter), [bills, supplierFilter]);

  /** Boletos agrupados por fornecedor, do maior total para o menor. */
  const groups = useMemo(() => {
    const map = new Map<string, Bill[]>();
    visible.forEach((b) => map.set(b.supplier, [...(map.get(b.supplier) ?? []), b]));
    return [...map.entries()]
      .map(([supplier, items]) => ({
        supplier,
        items: items.sort((a, b) => a.due_date.localeCompare(b.due_date)),
        total: items.reduce((s, b) => s + b.amount, 0),
        next: items.reduce((min, b) => (b.due_date < min ? b.due_date : min), items[0].due_date),
      }))
      .sort((a, b) => b.total - a.total);
  }, [visible]);

  const grandTotal = visible.reduce((s, b) => s + b.amount, 0);
  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.name ?? "—";
  const periodLabel = `${dateFrom ? fmtDate(dateFrom) : "início"} a ${dateTo ? fmtDate(dateTo) : "sem limite"}`;

  function exportPdf() {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setFontSize(14);
    doc.text(`Relatório de Boletos — ${SCOPE_LABELS[scope]}`, 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Loja: ${storeId === "all" ? "Todas" : storeName(storeId)}   •   Vencimento: ${periodLabel}${supplierFilter ? `   •   Fornecedor: ${supplierFilter}` : ""}   •   Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      14, 22,
    );
    doc.setTextColor(0);

    // Resumo por fornecedor
    autoTable(doc, {
      startY: 27,
      head: [["Fornecedor", "Boletos", "Próximo vencimento", "Total"]],
      body: [
        ...groups.map((g) => [g.supplier, String(g.items.length), fmtDate(g.next), brl(g.total)]),
        ["TOTAL", String(visible.length), "", brl(grandTotal)],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" }, 3: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === groups.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [241, 245, 249];
        }
      },
    });

    // Detalhe por fornecedor
    const body: (string | { content: string; colSpan?: number; styles?: object })[][] = [];
    groups.forEach((g) => {
      body.push([{ content: `${g.supplier} — ${g.items.length} boleto${g.items.length > 1 ? "s" : ""}`, colSpan: 5, styles: { fontStyle: "bold", fillColor: [226, 232, 240] } }]);
      g.items.forEach((b) => body.push([fmtDate(b.due_date), daysLabel(daysUntil(b.due_date, today)), b.description || "—", storeName(b.store_id), brl(b.amount)]));
      body.push([{ content: `Subtotal ${g.supplier}`, colSpan: 4, styles: { fontStyle: "bold", halign: "right" } }, { content: brl(g.total), styles: { fontStyle: "bold", halign: "right" } }]);
    });
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 40) + 8,
      head: [["Vencimento", "Prazo", "Descrição", "Loja", "Valor"]],
      body,
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      columnStyles: { 4: { halign: "right" } },
    });
    doc.save(`boletos_${scope}_por_fornecedor.pdf`);
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Relatório de boletos por fornecedor"
        description="Boletos em aberto agrupados por fornecedor, com total e próximos vencimentos."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchReport} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Gerar relatório
            </Button>
            {fetched && visible.length > 0 && (
              <Button variant="outline" onClick={exportPdf}><FileDown className="size-4" /> PDF</Button>
            )}
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Select value={scope} onChange={(e) => changeScope(e.target.value as Scope)}>
            {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
          </Select>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <Input type="date" className="min-w-0" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Vencimento a partir de" />
            <span className="text-sm text-slate-400">até</span>
            <Input type="date" className="min-w-0" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Vencimento até" />
          </div>
          <Select value={storeId} onChange={(e) => setStoreId(e.target.value)} disabled={!isAdmin && !!ownStore}>
            {(isAdmin || !ownStore) && <option value="all">Todas as lojas</option>}
            {stores.filter((s) => isAdmin || !ownStore || s.id === ownStore).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} disabled={!fetched}>
            <option value="">Todos os fornecedores</option>
            {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        {scope === "a_vencer" && <p className="mt-2 text-xs text-slate-400">Deixe a data final vazia para ver todos os boletos a vencer, sem limite.</p>}
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      </SectionCard>

      {!fetched ? (
        <p className="py-8 text-center text-sm text-slate-400">Escolha os filtros e clique em Gerar relatório.</p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum boleto encontrado para esses filtros.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{brl(grandTotal)}</p>
              <p className="text-xs text-slate-400">{visible.length} boleto{visible.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fornecedores</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{groups.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Período</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{periodLabel}</p>
            </div>
          </div>

          <SectionCard title="Resumo por fornecedor" description="Clique no fornecedor para ver só os boletos dele.">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Fornecedor", "Boletos", "Próximo vencimento", "Total"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groups.map((g) => (
                    <tr key={g.supplier} onClick={() => setSupplierFilter(supplierFilter === g.supplier ? "" : g.supplier)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{g.supplier}</td>
                      <td className="px-3 py-2 text-slate-600">{g.items.length}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmtDate(g.next)} <span className="text-xs text-slate-400">({daysLabel(daysUntil(g.next, today))})</span></td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{brl(g.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Total</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{visible.length}</td>
                    <td />
                    <td className="px-3 py-2.5 text-base font-bold text-slate-900">{brl(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <div className="space-y-4">
            {groups.map((g) => (
              <SectionCard key={g.supplier} title={g.supplier} description={`${g.items.length} boleto${g.items.length > 1 ? "s" : ""} • total ${brl(g.total)}`}>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {g.items.map((b) => {
                    const days = daysUntil(b.due_date, today);
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {fmtDate(b.due_date)}{" "}
                            <span className={`text-xs font-semibold ${days < 0 ? "text-rose-600" : days <= 3 ? "text-amber-600" : "text-slate-400"}`}>{daysLabel(days)}</span>
                          </p>
                          <p className="truncate text-xs text-slate-500">{b.description || "—"} • {storeName(b.store_id)}</p>
                        </div>
                        <p className="shrink-0 font-semibold text-slate-900">{brl(b.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
