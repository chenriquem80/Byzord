import { supabase } from "@/lib/database";

export const CANCEL_TYPE = "Cancelamento";
export const CANCELLED_EXIT_TYPE = "Saída cancelada";

/**
 * Id do registro de cancelamento de uma saída (e vice-versa: aplicar de novo devolve o original).
 * Como o id é único no banco, a mesma saída não pode ser cancelada duas vezes.
 */
export function cancelIdOf(id: string): string {
  return (parseInt(id[0], 16) ^ 8).toString(16) + id.slice(1);
}

/** Ids das saídas canceladas. O cancelamento é sempre posterior à saída, então basta a data inicial. */
export async function fetchCancelledExitIds(since: Date): Promise<{ ids: Set<string>; error: string | null }> {
  if (!supabase) return { ids: new Set(), error: null };
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id")
    .eq("type", CANCEL_TYPE)
    .gte("created_at", since.toISOString());
  return { ids: new Set((data ?? []).map((m: any) => cancelIdOf(m.id))), error: error?.message ?? null };
}

/** Marca as saídas canceladas para ficarem fora dos totais. */
export function markCancelled<T extends { id: string; type: string }>(rows: T[], ids: Set<string>): T[] {
  return rows.map((r) => (r.type === "Saída" && ids.has(r.id) ? { ...r, type: CANCELLED_EXIT_TYPE } : r));
}

/** Quantidade com sinal; cancelamentos não somam nem subtraem. */
export function signedQuantity(r: { type: string; quantity: number }): string {
  if (r.type === CANCEL_TYPE || r.type === CANCELLED_EXIT_TYPE) return String(r.quantity);
  return (r.type === "Entrada" ? "+" : "-") + r.quantity;
}
