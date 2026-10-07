import { useEffect, useState } from "react";
import { FileDown, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SectionCard } from "@/components/shared/section-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/database";

const catalogReports = [
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

type StoreRow = { id: string; name: string };

// ── Relatório 1: Estoque atual por loja ─────────────────────────────────────

type StockRow = {
  product_name: string;
  manufacturer: string;
  glass_type: string;
  feature: string;
  location: string;
  stock: number;
  min_quantity: number;
  store_name: string;
};

function StockByStoreReport() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storeId, setStoreId] = useState("all");
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("stores").select("id, name").then(({ data }) => {
      if (data) setStores(data);
    });
  }, []);

  async function fetchReport() {
    if (!supabase) return;
    setLoading(true);
    let q = supabase
      .from("product_store_inventory")
      .select("stock, min_quantity, location, stores(id, name), product_manufacturers(manufacturer, products(name, glass_type, feature))")
      .order("stock", { ascending: false });
    if (storeId !== "all") q = q.eq("store_id", storeId);
    const { data, error } = await q;
    if (error) { console.error(error); setLoading(false); return; }
    const mapped: StockRow[] = (data ?? []).map((r: any) => ({
      product_name: r.product_manufacturers?.products?.name ?? "—",
      manufacturer: r.product_manufacturers?.manufacturer ?? "—",
      glass_type: r.product_manufacturers?.products?.glass_type ?? "—",
      feature: r.product_manufacturers?.products?.feature ?? "—",
      location: r.location ?? "—",
      stock: r.stock ?? 0,
      min_quantity: r.min_quantity ?? 0,
      store_name: r.stores?.name ?? "—",
    }));
    setRows(mapped);
    setFetched(true);
    setLoading(false);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    const storeName = storeId === "all" ? "Todas as lojas" : (stores.find((s) => s.id === storeId)?.name ?? "");
    doc.setFontSize(14);
    doc.text("Estoque Atual por Loja", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Loja: ${storeName}   •   Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 23);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 28,
      head: [["Loja", "Produto", "Fabricante", "Tipo", "Característica", "Localização", "Estoque", "Mínimo"]],
      body: rows.map((r) => [r.store_name, r.product_name, r.manufacturer, r.glass_type, r.feature, r.location, r.stock, r.min_quantity]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const stock = Number(data.cell.raw);
          const min = Number(rows[data.row.index]?.min_quantity ?? 0);
          if (min > 0 && stock < min) data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });
    doc.save("estoque_por_loja.pdf");
  }

  return (
    <SectionCard
      title="Estoque atual por loja"
      description="Saldo de cada produto em cada loja, com localização e quantidade mínima."
      action={
        <div className="flex items-center gap-2">
          <Select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-44">
            <option value="all">Todas as lojas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Button size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Consultar
          </Button>
          {rows.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportPdf}>
              <FileDown className="size-3.5" /> PDF
            </Button>
          )}
        </div>
      }
    >
      {!fetched ? (
        <p className="py-8 text-center text-sm text-slate-400">Selecione a loja e clique em Consultar.</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum registro encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Loja", "Produto", "Fabricante", "Tipo", "Característica", "Localização", "Estoque", "Mínimo"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.store_name}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.product_name}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.manufacturer}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.glass_type}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.feature}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.location}</td>
                  <td className={`px-3 py-2 font-semibold whitespace-nowrap ${r.stock < r.min_quantity && r.min_quantity > 0 ? "text-rose-600" : "text-slate-900"}`}>
                    {r.stock}
                  </td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.min_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-xs text-slate-400">{rows.length} registro{rows.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </SectionCard>
  );
}

// ── Relatório 2: Movimentações por loja ─────────────────────────────────────

type MovRow = {
  created_at: string;
  type: string;
  product_name: string;
  manufacturer: string;
  store_name: string;
  quantity: number;
  user_name: string;
  note: string | null;
};

function MovementByStoreReport() {
  const today = new Date().toISOString().split("T")[0];
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storeId, setStoreId] = useState("all");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [typeFilter, setTypeFilter] = useState("all");
  const [rows, setRows] = useState<MovRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("stores").select("id, name").then(({ data }) => {
      if (data) setStores(data);
    });
  }, []);

  async function fetchReport() {
    if (!supabase) return;
    setLoading(true);
    const start = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T23:59:59.999");
    let q = supabase
      .from("stock_movements")
      .select("created_at, type, product_name, manufacturer, store_name, quantity, user_name, note")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    if (storeId !== "all") {
      const storeName = stores.find((s) => s.id === storeId)?.name ?? "";
      if (storeName) q = q.eq("store_name", storeName);
    }
    if (typeFilter !== "all") q = q.eq("type", typeFilter);
    const { data, error } = await q;
    if (error) { console.error(error); setLoading(false); return; }
    setRows(data ?? []);
    setFetched(true);
    setLoading(false);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    const storeName = storeId === "all" ? "Todas as lojas" : (stores.find((s) => s.id === storeId)?.name ?? "");
    const typeLabel = typeFilter === "all" ? "Entrada + Saída" : typeFilter;
    doc.setFontSize(14);
    doc.text("Movimentações por Loja", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Loja: ${storeName}   •   Tipo: ${typeLabel}   •   Período: ${dateFrom} a ${dateTo}   •   Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      14, 23
    );
    doc.text(`Entradas: ${totalEntradas} un.   |   Saídas: ${totalSaidas} un.`, 14, 29);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 34,
      head: [["Data", "Hora", "Tipo", "Loja", "Produto", "Fabricante", "Qtd", "Usuário", "Observação"]],
      body: rows.map((r) => {
        const d = new Date(r.created_at);
        return [
          d.toLocaleDateString("pt-BR"),
          d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          r.type, r.store_name, r.product_name, r.manufacturer,
          (r.type === "Entrada" ? "+" : "-") + r.quantity,
          r.user_name || "—", r.note || "—",
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const type = String(data.cell.raw);
          data.cell.styles.textColor = type === "Entrada" ? [109, 40, 217] : [180, 83, 9];
        }
      },
    });
    doc.save("movimentacoes_por_loja.pdf");
  }

  const totalEntradas = rows.filter((r) => r.type === "Entrada").reduce((s, r) => s + r.quantity, 0);
  const totalSaidas = rows.filter((r) => r.type === "Saída").reduce((s, r) => s + r.quantity, 0);

  return (
    <SectionCard
      title="Movimentações por loja"
      description="Entradas e saídas de estoque filtradas por loja e período."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-40">
            <option value="all">Todas as lojas</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-36">
            <option value="all">Entrada + Saída</option>
            <option value="Entrada">Somente entradas</option>
            <option value="Saída">Somente saídas</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-38" />
          <span className="text-sm text-slate-400">até</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-38" />
          <Button size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Consultar
          </Button>
          {rows.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportPdf}>
              <FileDown className="size-3.5" /> PDF
            </Button>
          )}
        </div>
      }
    >
      {!fetched ? (
        <p className="py-8 text-center text-sm text-slate-400">Selecione os filtros e clique em Consultar.</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhuma movimentação no período selecionado.</p>
      ) : (
        <>
          <div className="mb-4 flex gap-4">
            <div className="rounded-xl bg-violet-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Total entradas</p>
              <p className="mt-1 text-2xl font-bold text-violet-700">{totalEntradas} un.</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Total saídas</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{totalSaidas} un.</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Data", "Hora", "Tipo", "Loja", "Produto", "Fabricante", "Qtd", "Usuário", "Observação"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const d = new Date(r.created_at);
                  const isEntry = r.type === "Entrada";
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isEntry ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.store_name}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{r.product_name}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.manufacturer}</td>
                      <td className={`px-3 py-2 font-semibold whitespace-nowrap ${isEntry ? "text-violet-700" : "text-amber-700"}`}>
                        {isEntry ? "+" : "-"}{r.quantity}
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.user_name || "—"}</td>
                      <td className="px-3 py-2 text-slate-400">{r.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-border px-3 py-2 text-xs text-slate-400">{rows.length} registro{rows.length !== 1 ? "s" : ""}</p>
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Catálogo de relatórios" description="Organizado para o financeiro e a gestão do estoque.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalogReports.map((report) => (
            <Card key={report}>
              <CardContent className="p-5">
                <p className="font-semibold text-slate-900">{report}</p>
                <p className="mt-2 text-sm text-slate-600">Pronto para exportação e consulta por filtro.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      <StockByStoreReport />
      <MovementByStoreReport />
    </div>
  );
}
