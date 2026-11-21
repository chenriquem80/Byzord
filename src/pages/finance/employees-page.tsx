import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronUp, Pencil, Plus, Printer, RotateCcw, Trash2, Wand2, X } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/lib/database";
import {
  PAYMENT_KIND_LABELS,
  VACATION_STATE_LABELS,
  acquisitionPeriods,
  brl,
  fmtDate,
  monthLabel,
  monthStart,
  monthlyPayments,
  parts,
  paymentKey,
  serviceTime,
  thirteenthPayments,
  todayIso,
  vacationDeadline,
  vacationState,
  type Employee,
  type EmployeePayment,
  type NewPayment,
  type PaymentKind,
  type Vacation,
  type VacationState,
} from "@/lib/finance";

type Store = { id: string; name: string };

const MISSING_TABLE = /relation .* does not exist|Could not find the table|42P01|PGRST205/i;

const STATE_CLASS: Record<VacationState, string> = {
  em_aquisicao: "bg-slate-100 text-slate-600",
  a_vencer: "bg-amber-100 text-amber-800",
  vencida: "bg-rose-100 text-rose-700",
  tirada: "bg-emerald-100 text-emerald-700",
};

const num = (v: unknown) => Number(v ?? 0);

function emptyEmployeeForm(storeId: string) {
  return {
    name: "", cpf: "", job_title: "", store_id: storeId, admission_date: todayIso(),
    payment_type: "mensal" as Employee["payment_type"], salary: "", advance_amount: "",
    status: "ativo" as Employee["status"], dismissal_date: "", notes: "",
  };
}

function emptyPaymentForm(employeeId: string, monthValue: string) {
  return {
    employee_id: employeeId, kind: "holerite" as PaymentKind, month: monthValue,
    due_date: `${monthValue}-30`.replace(/-02-30$/, "-02-28"),
    gross: "", discounts: "0", notes: "",
  };
}

/** Situação das férias do funcionário (o período mais urgente). */
function employeeVacationSummary(vacs: Vacation[], today: string): { label: string; className: string } {
  const pending = vacs
    .map((v) => ({ v, st: vacationState(v, today) }))
    .filter((x) => x.st === "a_vencer" || x.st === "vencida")
    .sort((a, b) => a.v.acquisition_end.localeCompare(b.v.acquisition_end));
  if (pending.length > 0) {
    const { v, st } = pending[0];
    return st === "vencida"
      ? { label: `Férias vencidas (limite era ${fmtDate(vacationDeadline(v.acquisition_end))})`, className: STATE_CLASS.vencida }
      : { label: `Férias a vencer — tirar até ${fmtDate(vacationDeadline(v.acquisition_end))}`, className: STATE_CLASS.a_vencer };
  }
  const current = vacs.find((v) => vacationState(v, today) === "em_aquisicao");
  if (current) return { label: `Em aquisição — completa em ${fmtDate(current.acquisition_end)}`, className: STATE_CLASS.em_aquisicao };
  return vacs.length > 0 ? { label: "Férias em dia", className: STATE_CLASS.tirada } : { label: "Férias não registradas", className: STATE_CLASS.em_aquisicao };
}

function printPayslip(e: Employee, monthValue: string, items: EmployeePayment[], storeName: string) {
  const rows = items
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((p) => `<tr><td>${PAYMENT_KIND_LABELS[p.kind]}</td><td>${fmtDate(p.due_date)}</td><td class="n">${brl(num(p.gross))}</td><td class="n">${brl(num(p.discounts))}</td><td class="n">${brl(num(p.amount))}</td><td>${p.paid ? `Pago ${p.paid_at ? fmtDate(p.paid_at) : ""}` : "A pagar"}</td></tr>`)
    .join("");
  const total = (k: "gross" | "discounts" | "amount") => brl(items.reduce((s, p) => s + num(p[k]), 0));
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Holerite ${e.name} ${monthValue}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:18px;margin:0}h2{font-size:14px;color:#475569;margin:4px 0 16px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#f1f5f9}
.n{text-align:right}.info{font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:4px}.sign{margin-top:48px;display:flex;gap:48px;font-size:12px}
.sign div{flex:1;border-top:1px solid #0f172a;padding-top:4px;text-align:center}</style></head><body>
<h1>AUTO VITRAIS — Recibo de pagamento</h1><h2>Referência: ${monthLabel(monthStart(monthValue))}</h2>
<div class="info"><div><b>Funcionário:</b> ${e.name}</div><div><b>CPF:</b> ${e.cpf || "—"}</div>
<div><b>Cargo:</b> ${e.job_title || "—"}</div><div><b>Loja:</b> ${storeName}</div>
<div><b>Admissão:</b> ${fmtDate(e.admission_date)}</div><div><b>Pagamento:</b> ${e.payment_type === "mensal" ? `Mensal — salário ${brl(num(e.salary))}` : `Semanal — ${brl(num(e.salary))} por semana`}</div></div>
<table><thead><tr><th>Descrição</th><th>Data</th><th class="n">Bruto</th><th class="n">Descontos</th><th class="n">Líquido</th><th>Situação</th></tr></thead>
<tbody>${rows || `<tr><td colspan="6">Nenhum lançamento no mês.</td></tr>`}</tbody>
<tfoot><tr><th colspan="2">Total</th><th class="n">${total("gross")}</th><th class="n">${total("discounts")}</th><th class="n">${total("amount")}</th><th></th></tr></tfoot></table>
<div class="sign"><div>Empresa</div><div>${e.name}</div></div>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Permita pop-ups para imprimir o holerite."); return; }
  w.document.write(html);
  w.document.close();
}

export function EmployeesPage() {
  const { user } = useAuth();
  const { readOnly } = usePermissions();
  const isAdmin = user?.role === "ADMIN";
  const today = todayIso();
  const currentMonth = today.slice(0, 7);

  const [tab, setTab] = useState("funcionarios");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"ativo" | "inativo" | "todos">("ativo");
  const [storeFilter, setStoreFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>([]);

  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState(emptyEmployeeForm(user?.storeId ?? ""));
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [month, setMonth] = useState(currentMonth);
  const [monthPayments, setMonthPayments] = useState<EmployeePayment[]>([]);
  const [generating, setGenerating] = useState(false);

  const [paymentDialog, setPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EmployeePayment | null>(null);
  const [payForm, setPayForm] = useState(emptyPaymentForm("", currentMonth));
  const [savingPayment, setSavingPayment] = useState(false);

  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.name ?? "—";
  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  function handleDbError(err: { message: string } | null, action: string): boolean {
    if (!err) return false;
    setError(MISSING_TABLE.test(err.message)
      ? "As tabelas do Financeiro ainda não foram criadas no banco de dados."
      : `Erro ao ${action}: ${err.message}`);
    return true;
  }

  async function load() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [empResp, vacResp, storesResp] = await Promise.all([
      supabase.from("employees").select("*").order("name"),
      supabase.from("employee_vacations").select("*").order("acquisition_start"),
      supabase.from("stores").select("id, name").order("name"),
    ]);
    setStores(storesResp.data ?? []);
    if (!handleDbError(empResp.error, "carregar funcionários")) {
      setEmployees((empResp.data ?? []).map((e: any) => ({ ...e, salary: num(e.salary), advance_amount: num(e.advance_amount) })));
      setVacations(vacResp.data ?? []);
    }
    setLoading(false);
  }

  async function loadMonthPayments(monthValue = month) {
    if (!supabase) return;
    const { data, error: err } = await supabase.from("employee_payments").select("*")
      .eq("reference_month", monthStart(monthValue)).order("due_date");
    if (!handleDbError(err, "carregar pagamentos")) setMonthPayments(data ?? []);
  }

  async function loadEmployeePayments(employeeId: string) {
    if (!supabase) return;
    const { data, error: err } = await supabase.from("employee_payments").select("*")
      .eq("employee_id", employeeId).order("due_date", { ascending: false }).limit(200);
    if (!handleDbError(err, "carregar pagamentos")) setEmployeePayments(data ?? []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "pagamentos") loadMonthPayments(month); }, [tab, month]);

  /** Cria os períodos aquisitivos que ainda não existem (da admissão até hoje). */
  async function ensureVacationPeriods(e: Employee) {
    if (!supabase || readOnly) return;
    const existing = new Set(vacations.filter((v) => v.employee_id === e.id).map((v) => v.acquisition_start));
    const until = e.status === "inativo" && e.dismissal_date ? e.dismissal_date : today;
    const missing = acquisitionPeriods(e.admission_date, until)
      .filter((p) => !existing.has(p.start))
      .map((p) => ({ employee_id: e.id, acquisition_start: p.start, acquisition_end: p.end, status: "a_vencer" }));
    if (missing.length === 0) return;
    const { data, error: err } = await supabase.from("employee_vacations")
      .upsert(missing, { onConflict: "employee_id,acquisition_start", ignoreDuplicates: true }).select("*");
    if (!handleDbError(err, "gerar períodos de férias")) setVacations((prev) => [...prev, ...(data ?? [])]);
  }

  function toggleExpand(e: Employee) {
    if (expandedId === e.id) { setExpandedId(null); return; }
    setExpandedId(e.id);
    setEmployeePayments([]);
    loadEmployeePayments(e.id);
    ensureVacationPeriods(e);
  }

  /* ---------- funcionário ---------- */

  function openNewEmployee() {
    setEditingEmployee(null);
    setEmpForm(emptyEmployeeForm(isAdmin ? (stores[0]?.id ?? "") : (user?.storeId ?? "")));
    setEmployeeDialog(true);
  }

  function openEditEmployee(e: Employee) {
    setEditingEmployee(e);
    setEmpForm({
      name: e.name, cpf: e.cpf ?? "", job_title: e.job_title ?? "", store_id: e.store_id ?? "",
      admission_date: e.admission_date, payment_type: e.payment_type, salary: String(e.salary),
      advance_amount: String(e.advance_amount), status: e.status, dismissal_date: e.dismissal_date ?? "", notes: e.notes ?? "",
    });
    setEmployeeDialog(true);
  }

  async function saveEmployee() {
    if (!supabase) return;
    if (!empForm.name.trim()) { setError("Informe o nome do funcionário."); return; }
    if (!empForm.admission_date) { setError("Informe a data de admissão."); return; }
    setSavingEmployee(true);
    setError(null);
    const row = {
      name: empForm.name.trim(),
      cpf: empForm.cpf.trim() || null,
      job_title: empForm.job_title.trim() || null,
      store_id: empForm.store_id || null,
      admission_date: empForm.admission_date,
      payment_type: empForm.payment_type,
      salary: num(String(empForm.salary).replace(",", ".")),
      advance_amount: empForm.payment_type === "mensal" ? num(String(empForm.advance_amount).replace(",", ".")) : 0,
      status: empForm.status,
      dismissal_date: empForm.status === "inativo" ? (empForm.dismissal_date || null) : null,
      notes: empForm.notes.trim() || null,
    };
    const { error: err } = editingEmployee
      ? await supabase.from("employees").update(row).eq("id", editingEmployee.id)
      : await supabase.from("employees").insert(row);
    setSavingEmployee(false);
    if (handleDbError(err, "salvar funcionário")) return;
    setEmployeeDialog(false);
    setMessage(editingEmployee ? "Funcionário atualizado." : "Funcionário cadastrado.");
    load();
  }

  async function deleteEmployee(e: Employee) {
    if (!supabase) return;
    if (!window.confirm(`Excluir ${e.name}? Férias e pagamentos registrados também serão apagados. Para manter o histórico, marque como inativo.`)) return;
    const { error: err } = await supabase.from("employees").delete().eq("id", e.id);
    if (handleDbError(err, "excluir funcionário")) return;
    setEmployees((prev) => prev.filter((x) => x.id !== e.id));
    setExpandedId(null);
  }

  /* ---------- férias ---------- */

  async function updateVacation(v: Vacation, patch: Partial<Vacation>) {
    if (!supabase) return;
    const next = { ...v, ...patch };
    setVacations((prev) => prev.map((x) => x.id === v.id ? next : x));
    const { error: err } = await supabase.from("employee_vacations")
      .update({ status: next.status, taken_start: next.taken_start || null, taken_end: next.taken_end || null })
      .eq("id", v.id);
    if (handleDbError(err, "salvar férias")) setVacations((prev) => prev.map((x) => x.id === v.id ? v : x));
  }

  /* ---------- pagamentos ---------- */

  async function insertMissing(list: NewPayment[], existing: EmployeePayment[]): Promise<number> {
    if (!supabase) return 0;
    const have = new Set(existing.map(paymentKey));
    const toInsert = list.filter((p) => !have.has(paymentKey(p)));
    if (toInsert.length === 0) return 0;
    const { error: err } = await supabase.from("employee_payments").insert(toInsert);
    if (handleDbError(err, "gerar pagamentos")) return -1;
    return toInsert.length;
  }

  async function generateMonth() {
    if (!supabase) return;
    setGenerating(true);
    setMessage(null);
    const active = employees.filter((e) => storeFilter === "all" || e.store_id === storeFilter);
    const list = active.flatMap((e) => monthlyPayments(e, month));
    const created = await insertMissing(list, monthPayments);
    setGenerating(false);
    if (created >= 0) {
      setMessage(created > 0
        ? `${created} pagamento${created > 1 ? "s" : ""} gerado${created > 1 ? "s" : ""} para ${monthLabel(monthStart(month))}.`
        : "Os pagamentos deste mês já estavam gerados.");
      loadMonthPayments(month);
    }
  }

  async function generateThirteenth(e: Employee) {
    if (!supabase) return;
    const year = Number(window.prompt("Gerar 13º de qual ano?", String(parts(today)[0])));
    if (!year) return;
    const { data } = await supabase.from("employee_payments").select("*").eq("employee_id", e.id)
      .in("kind", ["13_primeira", "13_segunda"]);
    const created = await insertMissing(thirteenthPayments(e, year), data ?? []);
    if (created >= 0) {
      setMessage(created > 0 ? `13º de ${year} gerado para ${e.name} (1ª parcela até 30/11 e 2ª até 20/12).` : `O 13º de ${year} de ${e.name} já estava gerado.`);
      loadEmployeePayments(e.id);
    }
  }

  async function togglePaid(p: EmployeePayment) {
    if (!supabase) return;
    const paid = !p.paid;
    const patch = { paid, paid_at: paid ? today : null };
    const { error: err } = await supabase.from("employee_payments").update(patch).eq("id", p.id);
    if (handleDbError(err, "atualizar pagamento")) return;
    const apply = (list: EmployeePayment[]) => list.map((x) => x.id === p.id ? { ...x, ...patch } : x);
    setMonthPayments(apply);
    setEmployeePayments(apply);
  }

  async function deletePayment(p: EmployeePayment) {
    if (!supabase) return;
    if (!window.confirm(`Excluir ${PAYMENT_KIND_LABELS[p.kind]} de ${employeeName(p.employee_id)} (${brl(num(p.amount))})?`)) return;
    const { error: err } = await supabase.from("employee_payments").delete().eq("id", p.id);
    if (handleDbError(err, "excluir pagamento")) return;
    setMonthPayments((prev) => prev.filter((x) => x.id !== p.id));
    setEmployeePayments((prev) => prev.filter((x) => x.id !== p.id));
  }

  function openNewPayment(employeeId: string) {
    setEditingPayment(null);
    setPayForm(emptyPaymentForm(employeeId, month));
    setPaymentDialog(true);
  }

  function openEditPayment(p: EmployeePayment) {
    setEditingPayment(p);
    setPayForm({
      employee_id: p.employee_id, kind: p.kind, month: p.reference_month.slice(0, 7), due_date: p.due_date,
      gross: String(num(p.gross)), discounts: String(num(p.discounts)), notes: p.notes ?? "",
    });
    setPaymentDialog(true);
  }

  async function savePayment() {
    if (!supabase) return;
    if (!payForm.employee_id) { setError("Escolha o funcionário."); return; }
    if (!payForm.due_date) { setError("Informe a data de pagamento."); return; }
    const gross = num(String(payForm.gross).replace(",", "."));
    const discounts = num(String(payForm.discounts).replace(",", "."));
    setSavingPayment(true);
    setError(null);
    const row = {
      employee_id: payForm.employee_id, kind: payForm.kind, reference_month: monthStart(payForm.month),
      due_date: payForm.due_date, gross, discounts, amount: Math.round((gross - discounts) * 100) / 100,
      notes: payForm.notes.trim() || null,
    };
    const { error: err } = editingPayment
      ? await supabase.from("employee_payments").update(row).eq("id", editingPayment.id)
      : await supabase.from("employee_payments").insert(row);
    setSavingPayment(false);
    if (handleDbError(err, "salvar pagamento")) return;
    setPaymentDialog(false);
    if (tab === "pagamentos") loadMonthPayments(month);
    if (expandedId) loadEmployeePayments(expandedId);
  }

  /* ---------- listas ---------- */

  const visibleEmployees = useMemo(() => employees.filter((e) =>
    (statusFilter === "todos" || e.status === statusFilter) && (storeFilter === "all" || e.store_id === storeFilter)
  ), [employees, statusFilter, storeFilter]);

  const visibleMonthPayments = useMemo(() => monthPayments.filter((p) => {
    const e = employees.find((x) => x.id === p.employee_id);
    return storeFilter === "all" || e?.store_id === storeFilter;
  }), [monthPayments, employees, storeFilter]);

  const byDueDate = useMemo(() => {
    const map = new Map<string, EmployeePayment[]>();
    visibleMonthPayments.forEach((p) => map.set(p.due_date, [...(map.get(p.due_date) ?? []), p]));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleMonthPayments]);

  const totalMonth = visibleMonthPayments.reduce((s, p) => s + num(p.amount), 0);
  const paidMonth = visibleMonthPayments.filter((p) => p.paid).reduce((s, p) => s + num(p.amount), 0);

  const paymentActions = (p: EmployeePayment) => !readOnly && (
    <div className="flex shrink-0 items-center gap-1">
      <Button size="sm" variant={p.paid ? "outline" : "default"} onClick={() => togglePaid(p)}>
        {p.paid ? <><RotateCcw className="size-3.5" /> Reabrir</> : <><Check className="size-3.5" /> Pago</>}
      </Button>
      <button type="button" title="Editar" onClick={() => openEditPayment(p)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="size-4" /></button>
      <button type="button" title="Excluir" onClick={() => deletePayment(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-4" /></button>
    </div>
  );

  const paymentRow = (p: EmployeePayment, showName: boolean) => (
    <div key={p.id} className="flex flex-col gap-2 border-b border-border px-3 py-2.5 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          {showName ? `${employeeName(p.employee_id)} — ` : ""}{PAYMENT_KIND_LABELS[p.kind]}
        </p>
        <p className="text-xs text-slate-500">
          {fmtDate(p.due_date)} • bruto {brl(num(p.gross))}{num(p.discounts) > 0 ? ` • descontos ${brl(num(p.discounts))}` : ""}
          {p.notes ? ` • ${p.notes}` : ""}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="text-right">
          <p className="text-base font-bold text-slate-900">{brl(num(p.amount))}</p>
          <p className={`text-xs font-semibold ${p.paid ? "text-emerald-600" : p.due_date < today ? "text-rose-600" : "text-slate-400"}`}>
            {p.paid ? `Pago${p.paid_at ? ` ${fmtDate(p.paid_at)}` : ""}` : p.due_date < today ? "Atrasado" : "A pagar"}
          </p>
        </div>
        {paymentActions(p)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos do mês</TabsTrigger>
        </TabsList>

        {/* ---------------- Funcionários ---------------- */}
        <TabsContent value="funcionarios">
          <SectionCard
            title="Registro de funcionários"
            description="Tempo de registro, férias, pagamentos, holerite e 13º de cada funcionário."
            action={!readOnly && (
              <Button onClick={openNewEmployee}><Plus className="size-4" /> Novo funcionário</Button>
            )}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
                <option value="todos">Todos</option>
              </Select>
              <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="all">Todas as lojas</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-slate-400">Carregando...</p>
            ) : visibleEmployees.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Nenhum funcionário cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {visibleEmployees.map((e) => {
                  const vacs = vacations.filter((v) => v.employee_id === e.id).sort((a, b) => b.acquisition_start.localeCompare(a.acquisition_start));
                  const summary = employeeVacationSummary(vacs, today);
                  const open = expandedId === e.id;
                  const paymentsByMonth = new Map<string, EmployeePayment[]>();
                  if (open) employeePayments.forEach((p) => paymentsByMonth.set(p.reference_month, [...(paymentsByMonth.get(p.reference_month) ?? []), p]));
                  return (
                    <div key={e.id} className="overflow-hidden rounded-2xl border border-border bg-white">
                      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <button type="button" onClick={() => toggleExpand(e)} className="min-w-0 flex-1 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{e.name}</p>
                            {e.status === "inativo" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">Inativo</span>}
                            {open ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                          </div>
                          <p className="text-sm text-slate-500">
                            {[e.job_title, storeName(e.store_id)].filter((x) => x && x !== "—").join(" • ") || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Registrado desde {fmtDate(e.admission_date)} • {serviceTime(e.admission_date, e.status === "inativo" && e.dismissal_date ? e.dismissal_date : today)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {e.payment_type === "mensal"
                              ? `Mensal: salário ${brl(e.salary)}${e.advance_amount > 0 ? ` • vale dia 15 ${brl(e.advance_amount)} • saldo dia 30 ${brl(e.salary - e.advance_amount)}` : " • pagamento dia 30"}`
                              : `Semanal: ${brl(e.salary)} por semana (sextas-feiras)`}
                          </p>
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${summary.className}`}>{summary.label}</span>
                          {!readOnly && (
                            <>
                              <button type="button" title="Editar" onClick={() => openEditEmployee(e)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="size-4" /></button>
                              <button type="button" title="Excluir" onClick={() => deleteEmployee(e)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-4" /></button>
                            </>
                          )}
                        </div>
                      </div>

                      {open && (
                        <div className="space-y-5 border-t border-border bg-slate-50 p-4">
                          {/* Férias */}
                          <div>
                            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><CalendarDays className="size-4" /> Férias</p>
                            {vacs.length === 0 ? (
                              <p className="text-sm text-slate-400">Nenhum período registrado.</p>
                            ) : (
                              <div className="space-y-2">
                                {vacs.map((v) => {
                                  const st = vacationState(v, today);
                                  return (
                                    <div key={v.id} className="grid gap-3 rounded-xl border border-border bg-white p-3 md:grid-cols-[1.3fr_0.9fr_1.4fr] md:items-center">
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">Período aquisitivo {fmtDate(v.acquisition_start)} a {fmtDate(v.acquisition_end)}</p>
                                        <p className="text-xs text-slate-500">Tirar até {fmtDate(vacationDeadline(v.acquisition_end))}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_CLASS[st]}`}>{VACATION_STATE_LABELS[st]}</span>
                                      </div>
                                      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                                        <Select
                                          value={v.status}
                                          disabled={readOnly}
                                          onChange={(ev) => updateVacation(v, { status: ev.target.value as Vacation["status"] })}
                                          className="h-9 w-32 text-xs"
                                        >
                                          <option value="a_vencer">A vencer</option>
                                          <option value="tirada">Tirada</option>
                                        </Select>
                                        <Input type="date" className="h-9 text-xs" title="Início das férias" disabled={readOnly || v.status !== "tirada"}
                                          value={v.taken_start ?? ""} onChange={(ev) => updateVacation(v, { taken_start: ev.target.value || null })} />
                                        <Input type="date" className="h-9 text-xs" title="Fim das férias" disabled={readOnly || v.status !== "tirada"}
                                          value={v.taken_end ?? ""} onChange={(ev) => updateVacation(v, { taken_end: ev.target.value || null })} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Pagamentos */}
                          <div>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">Pagamentos, holerite e 13º</p>
                              {!readOnly && (
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openNewPayment(e.id)}><Plus className="size-3.5" /> Lançar</Button>
                                  <Button size="sm" variant="outline" onClick={() => generateThirteenth(e)}><Wand2 className="size-3.5" /> Gerar 13º</Button>
                                </div>
                              )}
                            </div>
                            {paymentsByMonth.size === 0 ? (
                              <p className="text-sm text-slate-400">Nenhum pagamento lançado. Gere os pagamentos em "Pagamentos do mês" ou lance manualmente.</p>
                            ) : (
                              <div className="space-y-3">
                                {[...paymentsByMonth.entries()].map(([ref, items]) => (
                                  <div key={ref} className="overflow-hidden rounded-xl border border-border bg-white">
                                    <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{monthLabel(ref)}</p>
                                      <button type="button" onClick={() => printPayslip(e, ref.slice(0, 7), items, storeName(e.store_id))}
                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                        <Printer className="size-3.5" /> Holerite
                                      </button>
                                    </div>
                                    {items.slice().sort((a, b) => a.due_date.localeCompare(b.due_date)).map((p) => paymentRow(p, false))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ---------------- Pagamentos do mês ---------------- */}
        <TabsContent value="pagamentos">
          <SectionCard
            title="Pagamentos do mês"
            description="Mensal: vale no dia 15 e saldo no dia 30. Semanal: toda sexta-feira."
            action={!readOnly && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => openNewPayment("")}><Plus className="size-4" /> Lançar</Button>
                <Button onClick={generateMonth} disabled={generating}><Wand2 className="size-4" /> {generating ? "Gerando..." : "Gerar pagamentos do mês"}</Button>
              </div>
            )}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value || currentMonth)} />
              <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="all">Todas as lojas</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total do mês</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{brl(totalMonth)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pago</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">{brl(paidMonth)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">A pagar</p>
                <p className="mt-1 text-xl font-bold text-amber-800">{brl(totalMonth - paidMonth)}</p>
              </div>
            </div>

            {byDueDate.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhum pagamento em {monthLabel(monthStart(month))}. {!readOnly && "Clique em \"Gerar pagamentos do mês\" para criar vales, saldos e semanais."}
              </p>
            ) : (
              <div className="space-y-3">
                {byDueDate.map(([due, items]) => (
                  <div key={due} className="overflow-hidden rounded-xl border border-border bg-white">
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {fmtDate(due)} — {new Date(parts(due)[0], parts(due)[1] - 1, parts(due)[2]).toLocaleDateString("pt-BR", { weekday: "long" })}
                      </p>
                      <p className="text-sm font-bold text-slate-800">{brl(items.reduce((s, p) => s + num(p.amount), 0))}</p>
                    </div>
                    {items.map((p) => paymentRow(p, true))}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Dialog: funcionário */}
      <Dialog open={employeeDialog} onOpenChange={setEmployeeDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Nome" className="md:col-span-2">
              <Input value={empForm.name} onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="CPF">
              <Input value={empForm.cpf} onChange={(e) => setEmpForm((f) => ({ ...f, cpf: e.target.value }))} inputMode="numeric" />
            </FormField>
            <FormField label="Cargo">
              <Input value={empForm.job_title} onChange={(e) => setEmpForm((f) => ({ ...f, job_title: e.target.value }))} placeholder="Ex: Instalador" />
            </FormField>
            <FormField label="Loja">
              <Select value={empForm.store_id} onChange={(e) => setEmpForm((f) => ({ ...f, store_id: e.target.value }))}>
                <option value="">Sem loja</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Data de admissão (registro)">
              <Input type="date" value={empForm.admission_date} onChange={(e) => setEmpForm((f) => ({ ...f, admission_date: e.target.value }))} />
            </FormField>
            <FormField label="Forma de pagamento">
              <Select value={empForm.payment_type} onChange={(e) => setEmpForm((f) => ({ ...f, payment_type: e.target.value as Employee["payment_type"] }))}>
                <option value="mensal">Mensal (vale dia 15 + saldo dia 30)</option>
                <option value="semanal">Semanal</option>
              </Select>
            </FormField>
            <FormField label={empForm.payment_type === "mensal" ? "Salário mensal (R$)" : "Valor por semana (R$)"}>
              <Input type="number" step="0.01" min="0" value={empForm.salary} onChange={(e) => setEmpForm((f) => ({ ...f, salary: e.target.value }))} />
            </FormField>
            {empForm.payment_type === "mensal" && (
              <FormField label="Vale do dia 15 (R$)" hint="Deixe 0 para pagar tudo no dia 30.">
                <Input type="number" step="0.01" min="0" value={empForm.advance_amount} onChange={(e) => setEmpForm((f) => ({ ...f, advance_amount: e.target.value }))} />
              </FormField>
            )}
            <FormField label="Situação">
              <Select value={empForm.status} onChange={(e) => setEmpForm((f) => ({ ...f, status: e.target.value as Employee["status"] }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo (desligado)</option>
              </Select>
            </FormField>
            {empForm.status === "inativo" && (
              <FormField label="Data de desligamento">
                <Input type="date" value={empForm.dismissal_date} onChange={(e) => setEmpForm((f) => ({ ...f, dismissal_date: e.target.value }))} />
              </FormField>
            )}
            <FormField label="Observações" className="md:col-span-2">
              <Textarea value={empForm.notes} onChange={(e) => setEmpForm((f) => ({ ...f, notes: e.target.value }))} />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveEmployee} disabled={savingEmployee}>{savingEmployee ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={() => setEmployeeDialog(false)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: pagamento */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editar pagamento" : "Lançar pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Funcionário" className="md:col-span-2">
              <Select value={payForm.employee_id} onChange={(e) => setPayForm((f) => ({ ...f, employee_id: e.target.value }))} disabled={!!editingPayment}>
                <option value="">Selecione</option>
                {employees.filter((e) => e.status === "ativo" || e.id === payForm.employee_id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Tipo">
              <Select value={payForm.kind} onChange={(e) => setPayForm((f) => ({ ...f, kind: e.target.value as PaymentKind }))}>
                {(Object.keys(PAYMENT_KIND_LABELS) as PaymentKind[]).map((k) => <option key={k} value={k}>{PAYMENT_KIND_LABELS[k]}</option>)}
              </Select>
            </FormField>
            <FormField label="Mês de referência">
              <Input type="month" value={payForm.month} onChange={(e) => setPayForm((f) => ({ ...f, month: e.target.value }))} />
            </FormField>
            <FormField label="Data do pagamento">
              <Input type="date" value={payForm.due_date} onChange={(e) => setPayForm((f) => ({ ...f, due_date: e.target.value }))} />
            </FormField>
            <FormField label="Valor bruto (R$)">
              <Input type="number" step="0.01" min="0" value={payForm.gross} onChange={(e) => setPayForm((f) => ({ ...f, gross: e.target.value }))} />
            </FormField>
            <FormField label="Descontos (R$)" hint="INSS, faltas, vale já pago etc.">
              <Input type="number" step="0.01" min="0" value={payForm.discounts} onChange={(e) => setPayForm((f) => ({ ...f, discounts: e.target.value }))} />
            </FormField>
            <div className="flex items-end">
              <p className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Líquido: <b className="text-slate-900">{brl(num(String(payForm.gross).replace(",", ".")) - num(String(payForm.discounts).replace(",", ".")))}</b>
              </p>
            </div>
            <FormField label="Observações" className="md:col-span-2">
              <Textarea value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={savePayment} disabled={savingPayment}>{savingPayment ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
