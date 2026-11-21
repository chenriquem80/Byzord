import { useEffect, useMemo, useState } from "react";
import { Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, Check, Copy, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { QrScannerDialog } from "@/components/shared/qr-scanner-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/lib/database";
import { parseBoleto, type BoletoInfo } from "@/lib/boleto";
import { addDays, brl, fmtDate, todayIso } from "@/lib/finance";

type Bill = {
  id: string;
  supplier: string;
  description: string | null;
  barcode: string | null;
  amount: number;
  issue_date: string | null;
  due_date: string;
  status: "aberto" | "pago";
  paid_at: string | null;
  store_id: string | null;
  notes: string | null;
  created_by: string | null;
};

type Store = { id: string; name: string };
type StatusFilter = "todos" | "aberto" | "vencido" | "pago";

const MISSING_TABLE = /relation .* does not exist|Could not find the table|42P01|PGRST205/i;

function emptyForm(storeId: string) {
  return { supplier: "", description: "", code: "", amount: "", issueDate: "", dueDate: "", storeId, notes: "" };
}

function billState(b: Bill, today: string): { label: string; className: string } {
  if (b.status === "pago") return { label: `Pago${b.paid_at ? ` em ${fmtDate(b.paid_at)}` : ""}`, className: "bg-emerald-100 text-emerald-700" };
  if (b.due_date < today) return { label: "Vencido", className: "bg-rose-100 text-rose-700" };
  if (b.due_date === today) return { label: "Vence hoje", className: "bg-amber-100 text-amber-800" };
  return { label: "Em aberto", className: "bg-slate-100 text-slate-700" };
}

export function BillsPage() {
  const { user } = useAuth();
  const { readOnly } = usePermissions();
  const isAdmin = user?.role === "ADMIN";
  const ownStore = user?.storeId ?? "";
  const today = todayIso();

  const [bills, setBills] = useState<Bill[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm(ownStore));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [codeInfo, setCodeInfo] = useState<BoletoInfo | null>(null);

  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("aberto");
  const [storeFilter, setStoreFilter] = useState(isAdmin ? "all" : ownStore);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [billsResp, storesResp, mfResp] = await Promise.all([
      supabase.from("bills").select("*").order("due_date", { ascending: true }),
      supabase.from("stores").select("id, name").order("name"),
      supabase.from("product_manufacturers").select("supplier"),
    ]);
    if (billsResp.error) {
      setError(MISSING_TABLE.test(billsResp.error.message)
        ? "As tabelas do Financeiro ainda não foram criadas no banco de dados."
        : `Erro ao carregar boletos: ${billsResp.error.message}`);
      setBills([]);
    } else {
      setError(null);
      setBills((billsResp.data ?? []).map((b: any) => ({ ...b, amount: Number(b.amount) })));
    }
    setStores(storesResp.data ?? []);
    const names = new Set<string>();
    (mfResp.data ?? []).forEach((r: any) => r.supplier && names.add(String(r.supplier).trim()));
    (billsResp.data ?? []).forEach((b: any) => b.supplier && names.add(String(b.supplier).trim()));
    setKnownSuppliers([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleCodeChange(value: string) {
    setForm((f) => ({ ...f, code: value }));
    const info = parseBoleto(value);
    setCodeInfo(info);
    if (info) {
      setForm((f) => ({
        ...f,
        code: value,
        amount: info.amount != null ? String(info.amount) : f.amount,
        dueDate: info.dueDate ?? f.dueDate,
      }));
    }
  }

  function handleScan(code: string) {
    setScannerOpen(false);
    handleCodeChange(code);
  }

  function startEdit(b: Bill) {
    setEditingId(b.id);
    setForm({
      supplier: b.supplier,
      description: b.description ?? "",
      code: b.barcode ?? "",
      amount: String(b.amount),
      issueDate: b.issue_date ?? "",
      dueDate: b.due_date,
      storeId: b.store_id ?? "",
      notes: b.notes ?? "",
    });
    setCodeInfo(b.barcode ? parseBoleto(b.barcode) : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(ownStore));
    setCodeInfo(null);
  }

  async function handleSave() {
    if (!supabase) return;
    setMessage(null);
    if (!form.supplier.trim()) { setError("Informe o fornecedor."); return; }
    if (!form.dueDate) { setError("Informe o vencimento."); return; }
    const amount = Number(String(form.amount).replace(",", "."));
    if (!(amount > 0)) { setError("Informe o valor do boleto."); return; }
    setError(null);
    setSaving(true);
    const row = {
      supplier: form.supplier.trim(),
      description: form.description.trim() || null,
      barcode: codeInfo?.barcode ?? (form.code.replace(/\D/g, "") || null),
      amount,
      issue_date: form.issueDate || null,
      due_date: form.dueDate,
      store_id: form.storeId || null,
      notes: form.notes.trim() || null,
    };
    const { error: err } = editingId
      ? await supabase.from("bills").update(row).eq("id", editingId)
      : await supabase.from("bills").insert({ ...row, created_by: user?.name ?? null });
    setSaving(false);
    if (err) { setError(`Erro ao salvar boleto: ${err.message}`); return; }
    setMessage(editingId ? "Boleto atualizado." : "Boleto lançado.");
    resetForm();
    load();
  }

  async function togglePaid(b: Bill) {
    if (!supabase) return;
    const paid = b.status !== "pago";
    const { error: err } = await supabase.from("bills")
      .update({ status: paid ? "pago" : "aberto", paid_at: paid ? today : null })
      .eq("id", b.id);
    if (err) { setError(`Erro ao atualizar boleto: ${err.message}`); return; }
    setBills((prev) => prev.map((x) => x.id === b.id ? { ...x, status: paid ? "pago" : "aberto", paid_at: paid ? today : null } : x));
  }

  async function handleDelete(b: Bill) {
    if (!supabase) return;
    if (!window.confirm(`Excluir o boleto de ${b.supplier} (${brl(b.amount)}, vencimento ${fmtDate(b.due_date)})?`)) return;
    const { error: err } = await supabase.from("bills").delete().eq("id", b.id);
    if (err) { setError(`Erro ao excluir boleto: ${err.message}`); return; }
    setBills((prev) => prev.filter((x) => x.id !== b.id));
  }

  function copyCode(b: Bill) {
    if (b.barcode) navigator.clipboard?.writeText(b.barcode).then(() => setMessage("Código de barras copiado."));
  }

  const filtered = useMemo(() => bills.filter((b) => {
    if (storeFilter !== "all" && b.store_id !== storeFilter) return false;
    if (supplierFilter && b.supplier !== supplierFilter) return false;
    if (dateFrom && b.due_date < dateFrom) return false;
    if (dateTo && b.due_date > dateTo) return false;
    if (statusFilter === "aberto") return b.status === "aberto";
    if (statusFilter === "vencido") return b.status === "aberto" && b.due_date < today;
    if (statusFilter === "pago") return b.status === "pago";
    return true;
  }), [bills, storeFilter, supplierFilter, dateFrom, dateTo, statusFilter, today]);

  const scoped = useMemo(() => bills.filter((b) => storeFilter === "all" || b.store_id === storeFilter), [bills, storeFilter]);
  const sum = (list: Bill[]) => list.reduce((s, b) => s + b.amount, 0);
  const open = scoped.filter((b) => b.status === "aberto");
  const overdue = open.filter((b) => b.due_date < today);
  const next7 = open.filter((b) => b.due_date >= today && b.due_date <= addDays(today, 7));

  const bySupplier = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach((b) => {
      const cur = map.get(b.supplier) ?? { total: 0, count: 0 };
      map.set(b.supplier, { total: cur.total + b.amount, count: cur.count + 1 });
    });
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const supplierOptions = useMemo(() => [...new Set(bills.map((b) => b.supplier))].sort((a, b) => a.localeCompare(b, "pt-BR")), [bills]);
  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <QrScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Ler código de barras do boleto"
        hint="Deite o celular e aponte para o código de barras do boleto, ocupando a faixa toda."
        formats={[Html5QrcodeSupportedFormats.ITF]}
        wide
        accept={(code) => !!parseBoleto(code)}
      />

      {error && (
        <div className="flex items-start justify-between gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0"><X className="size-4" /></button>
        </div>
      )}
      {message && (
        <div className="flex items-start justify-between gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="shrink-0"><X className="size-4" /></button>
        </div>
      )}

      {!readOnly && (
        <SectionCard
          title={editingId ? "Editar boleto" : "Lançar boleto"}
          description="Digite ou cole a linha digitável, ou leia o código de barras com a câmera do celular: valor e vencimento são preenchidos sozinhos."
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <FormField label="Código de barras / linha digitável">
                <Input
                  value={form.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="Ex: 34191.79001 01043.510047 91020.150008 8 84230000002000"
                  inputMode="numeric"
                />
              </FormField>
              <div className="flex items-end">
                <Button type="button" variant="outline" className="w-full" onClick={() => setScannerOpen(true)}>
                  <Camera className="size-4" />
                  Ler com a câmera
                </Button>
              </div>
            </div>
            {form.code.replace(/\D/g, "").length > 0 && (
              codeInfo ? (
                <p className={`rounded-xl px-3 py-2 text-sm ${codeInfo.valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                  {codeInfo.type === "bancario" ? "Boleto bancário" : "Conta de consumo / tributo"}
                  {codeInfo.amount != null ? ` • valor ${brl(codeInfo.amount)}` : ""}
                  {codeInfo.dueDate ? ` • vencimento ${fmtDate(codeInfo.dueDate)}` : codeInfo.type === "arrecadacao" ? " • informe o vencimento" : ""}
                  {!codeInfo.valid && " • o dígito verificador não confere, confira o código"}
                </p>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  {form.code.replace(/\D/g, "").length} dígitos — a linha digitável tem 47 (bancário) ou 48 (contas de consumo); o código de barras tem 44.
                </p>
              )
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Fornecedor">
                <Input
                  list="bill-suppliers"
                  value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  placeholder="Nome do fornecedor"
                />
                <datalist id="bill-suppliers">
                  {knownSuppliers.map((s) => <option key={s} value={s} />)}
                </datalist>
              </FormField>
              <FormField label="Valor (R$)">
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </FormField>
              <FormField label="Vencimento">
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </FormField>
              <FormField label="Emissão">
                <Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
              </FormField>
              <FormField label="Descrição" className="md:col-span-2">
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex: NF 1234 — vidros" />
              </FormField>
              <FormField label="Loja">
                <Select value={form.storeId} onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))} disabled={!isAdmin && !!ownStore}>
                  <option value="">Sem loja</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Observações" className="md:col-span-2 xl:col-span-4">
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </FormField>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Lançar boleto"}
              </Button>
              {(editingId || form.code || form.supplier) && (
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Em aberto</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{brl(sum(open))}</p>
          <p className="text-xs text-slate-400">{open.length} boleto{open.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Vencidos</p>
          <p className="mt-1 text-xl font-bold text-rose-700">{brl(sum(overdue))}</p>
          <p className="text-xs text-rose-500">{overdue.length} boleto{overdue.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Vencem em 7 dias</p>
          <p className="mt-1 text-xl font-bold text-amber-800">{brl(sum(next7))}</p>
          <p className="text-xs text-amber-600">{next7.length} boleto{next7.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <SectionCard title="Boletos" description="Controle por fornecedor e data de vencimento.">
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="aberto">Em aberto</option>
            <option value="vencido">Vencidos</option>
            <option value="pago">Pagos</option>
            <option value="todos">Todos</option>
          </Select>
          <Select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="">Todos os fornecedores</option>
            {supplierOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} disabled={!isAdmin && !!ownStore}>
            {isAdmin && <option value="all">Todas as lojas</option>}
            {stores.filter((s) => isAdmin || !ownStore || s.id === ownStore).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Vencimento a partir de" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Vencimento até" />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum boleto encontrado.</p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {filtered.map((b) => {
                const st = billState(b, today);
                return (
                  <div key={b.id} className="rounded-2xl border border-border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{b.supplier}</p>
                        <p className="text-xs text-slate-500">{b.description || "—"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st.className}`}>{st.label}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Vence {fmtDate(b.due_date)}</span>
                      <span className="text-base font-bold text-slate-900">{brl(b.amount)}</span>
                    </div>
                    {!readOnly && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant={b.status === "pago" ? "outline" : "default"} onClick={() => togglePaid(b)}>
                          {b.status === "pago" ? <><RotateCcw className="size-3.5" /> Reabrir</> : <><Check className="size-3.5" /> Pago</>}
                        </Button>
                        {b.barcode && <Button size="sm" variant="outline" onClick={() => copyCode(b)}><Copy className="size-3.5" /></Button>}
                        <Button size="sm" variant="outline" onClick={() => startEdit(b)}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(b)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Vencimento", "Fornecedor", "Descrição", "Loja", "Valor", "Situação", ""].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((b) => {
                    const st = billState(b, today);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{fmtDate(b.due_date)}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{b.supplier}</td>
                        <td className="px-3 py-2 text-slate-600">{b.description || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{storeName(b.store_id)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{brl(b.amount)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.className}`}>{st.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {!readOnly && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant={b.status === "pago" ? "outline" : "default"} onClick={() => togglePaid(b)}>
                                {b.status === "pago" ? <><RotateCcw className="size-3.5" /> Reabrir</> : <><Check className="size-3.5" /> Pago</>}
                              </Button>
                              {b.barcode && (
                                <button type="button" title="Copiar código de barras" onClick={() => copyCode(b)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                  <Copy className="size-4" />
                                </button>
                              )}
                              <button type="button" title="Editar" onClick={() => startEdit(b)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                                <Pencil className="size-4" />
                              </button>
                              <button type="button" title="Excluir" onClick={() => handleDelete(b)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total — {filtered.length} boleto{filtered.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-3 py-2.5 text-base font-bold text-slate-900">{brl(sum(filtered))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {bySupplier.length > 1 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Total por fornecedor</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {bySupplier.map(([name, v]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSupplierFilter(supplierFilter === name ? "" : name)}
                      className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2 text-left text-sm hover:border-primary"
                    >
                      <span className="font-medium text-slate-800">{name} <span className="text-xs text-slate-400">({v.count})</span></span>
                      <span className="font-semibold text-slate-900">{brl(v.total)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
