// Regras do Financeiro: tempo de registro, férias, geração de pagamentos (vale/saldo/semanal) e 13º.
// Datas sempre no formato AAAA-MM-DD (sem fuso).

export type PaymentType = "mensal" | "semanal";
export type PaymentKind = "vale" | "saldo" | "semanal" | "holerite" | "13_primeira" | "13_segunda" | "ferias" | "outro";

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  vale: "Vale (dia 15)",
  saldo: "Saldo (dia 30)",
  semanal: "Semanal",
  holerite: "Holerite",
  "13_primeira": "13º — 1ª parcela",
  "13_segunda": "13º — 2ª parcela",
  ferias: "Férias",
  outro: "Outro",
};

export type Employee = {
  id: string;
  name: string;
  cpf: string | null;
  job_title: string | null;
  store_id: string | null;
  admission_date: string;
  salary: number;
  payment_type: PaymentType;
  advance_amount: number;
  status: "ativo" | "inativo";
  dismissal_date: string | null;
  notes: string | null;
};

export type Vacation = {
  id: string;
  employee_id: string;
  acquisition_start: string;
  acquisition_end: string;
  status: "a_vencer" | "tirada";
  taken_start: string | null;
  taken_end: string | null;
  notes: string | null;
};

export type EmployeePayment = {
  id: string;
  employee_id: string;
  kind: PaymentKind;
  reference_month: string;
  due_date: string;
  gross: number;
  discounts: number;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
};

export type NewPayment = Omit<EmployeePayment, "id" | "paid" | "paid_at" | "notes"> & { notes?: string | null };

/* ---------- datas ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

export function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function todayIso(): string {
  const d = new Date();
  return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = parts(iso);
  return `${pad(d)}/${pad(m)}/${y}`;
}

export function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** Soma meses mantendo o dia (ajusta para o último dia do mês quando necessário). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12 + 1;
  return toIso(ny, nm, Math.min(d, lastDayOfMonth(ny, nm)));
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  const dt = new Date(y, m - 1, d + days);
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function monthStart(monthValue: string): string {
  // "2026-11" → "2026-11-01"
  return `${monthValue.slice(0, 7)}-01`;
}

export function monthLabel(iso: string): string {
  const [y, m] = parts(iso);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Tempo de registro: "2 anos e 3 meses". */
export function serviceTime(admission: string, until: string = todayIso()): string {
  const [ay, am, ad] = parts(admission);
  const [uy, um, ud] = parts(until);
  let months = (uy - ay) * 12 + (um - am);
  if (ud < ad) months--;
  if (months < 0) return "ainda não iniciou";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years > 0 ? `${years} ano${years > 1 ? "s" : ""}` : "";
  const mo = rest > 0 ? `${rest} ${rest > 1 ? "meses" : "mês"}` : "";
  if (!y && !mo) return "menos de 1 mês";
  return [y, mo].filter(Boolean).join(" e ");
}

/* ---------- férias ---------- */

/** Períodos aquisitivos (12 meses a partir da admissão) até o período em andamento hoje. */
export function acquisitionPeriods(admission: string, until: string = todayIso()): { start: string; end: string }[] {
  const periods: { start: string; end: string }[] = [];
  let start = admission;
  while (start <= until) {
    const end = addDays(addMonths(start, 12), -1);
    periods.push({ start, end });
    start = addMonths(start, 12);
  }
  return periods;
}

/** Limite para tirar as férias (fim do período concessivo: 12 meses após o aquisitivo). */
export function vacationDeadline(acquisitionEnd: string): string {
  return addMonths(acquisitionEnd, 12);
}

export type VacationState = "em_aquisicao" | "a_vencer" | "vencida" | "tirada";

export function vacationState(v: Pick<Vacation, "acquisition_end" | "status">, today: string = todayIso()): VacationState {
  if (v.status === "tirada") return "tirada";
  if (v.acquisition_end >= today) return "em_aquisicao";
  return vacationDeadline(v.acquisition_end) < today ? "vencida" : "a_vencer";
}

export const VACATION_STATE_LABELS: Record<VacationState, string> = {
  em_aquisicao: "Em aquisição",
  a_vencer: "A vencer",
  vencida: "Vencida",
  tirada: "Tirada",
};

/* ---------- pagamentos ---------- */

function worksInMonth(e: Employee, y: number, m: number): boolean {
  const first = toIso(y, m, 1);
  const last = toIso(y, m, lastDayOfMonth(y, m));
  if (e.admission_date > last) return false;
  if (e.status === "inativo" && (!e.dismissal_date || e.dismissal_date < first)) return false;
  return true;
}

export function fridaysOfMonth(y: number, m: number): string[] {
  const days: string[] = [];
  for (let d = 1; d <= lastDayOfMonth(y, m); d++) {
    if (new Date(y, m - 1, d).getDay() === 5) days.push(toIso(y, m, d));
  }
  return days;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pagamentos do mês de um funcionário:
 * - mensal: vale no dia 15 e saldo no dia 30 (último dia em fevereiro), saldo = salário − vale;
 * - semanal: um pagamento por sexta-feira do mês.
 */
export function monthlyPayments(e: Employee, monthValue: string): NewPayment[] {
  const [y, m] = parts(monthStart(monthValue));
  if (!worksInMonth(e, y, m)) return [];
  const reference_month = toIso(y, m, 1);
  if (e.payment_type === "semanal") {
    return fridaysOfMonth(y, m)
      .filter((d) => d >= e.admission_date)
      .map((due_date) => ({
        employee_id: e.id, kind: "semanal" as const, reference_month, due_date,
        gross: round2(e.salary), discounts: 0, amount: round2(e.salary),
      }));
  }
  const list: NewPayment[] = [];
  const advance = round2(Math.min(e.advance_amount ?? 0, e.salary));
  if (advance > 0) {
    list.push({ employee_id: e.id, kind: "vale", reference_month, due_date: toIso(y, m, 15), gross: advance, discounts: 0, amount: advance });
  }
  list.push({
    employee_id: e.id, kind: "saldo", reference_month,
    due_date: toIso(y, m, Math.min(30, lastDayOfMonth(y, m))),
    gross: round2(e.salary), discounts: advance, amount: round2(e.salary - advance),
  });
  return list;
}

/** Salário mensal equivalente (semanal × 52 ÷ 12). */
export function monthlySalary(e: Employee): number {
  return e.payment_type === "semanal" ? round2((e.salary * 52) / 12) : e.salary;
}

/** Meses trabalhados no ano para o 13º (conta o mês com 15 dias ou mais). */
export function monthsForThirteenth(e: Employee, year: number): number {
  let count = 0;
  for (let m = 1; m <= 12; m++) {
    const first = toIso(year, m, 1);
    const last = toIso(year, m, lastDayOfMonth(year, m));
    const start = e.admission_date > first ? e.admission_date : first;
    const endLimit = e.status === "inativo" && e.dismissal_date && e.dismissal_date < last ? e.dismissal_date : last;
    if (start > endLimit) continue;
    const days = parts(endLimit)[2] - parts(start)[2] + 1;
    if (days >= 15) count++;
  }
  return count;
}

/** 13º: 1ª parcela até 30/11 (metade) e 2ª até 20/12 (restante). */
export function thirteenthPayments(e: Employee, year: number): NewPayment[] {
  const months = monthsForThirteenth(e, year);
  if (months === 0) return [];
  const total = round2((monthlySalary(e) * months) / 12);
  const first = round2(total / 2);
  const note = `${months}/12 avos`;
  return [
    { employee_id: e.id, kind: "13_primeira", reference_month: toIso(year, 11, 1), due_date: toIso(year, 11, 30), gross: first, discounts: 0, amount: first, notes: note },
    { employee_id: e.id, kind: "13_segunda", reference_month: toIso(year, 12, 1), due_date: toIso(year, 12, 20), gross: round2(total - first), discounts: 0, amount: round2(total - first), notes: note },
  ];
}

/** Chave para não gerar o mesmo pagamento duas vezes. */
export function paymentKey(p: Pick<EmployeePayment, "employee_id" | "kind" | "due_date">): string {
  return `${p.employee_id}|${p.kind}|${p.due_date}`;
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
