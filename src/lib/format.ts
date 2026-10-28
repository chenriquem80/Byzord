export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function formatMonthYear(value: string) {
  // "AAAA-MM" ou "AAAA-MM-DD": lê direto, sem converter fuso (dia 1º viraria o mês anterior)
  const match = /^(d{4})-(d{2})/.exec(value ?? "");
  if (match) return `${match[2]}/${match[1]}`;
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}
