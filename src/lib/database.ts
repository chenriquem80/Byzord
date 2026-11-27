import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no .env");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Lê a tabela inteira em páginas. O Supabase devolve no máximo 1000 linhas por consulta,
 * então um select simples cortaria o estoque sem avisar quando a tabela crescer.
 */
export async function selectAll<T = any>(table: string, columns = "*"): Promise<{ data: T[] | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: "Banco de dados não configurado." } };
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).order("id").range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

/**
 * Operações administrativas de usuários (listar, criar, definir senha).
 * Rodam na Edge Function "admin-users", que guarda a chave de serviço no servidor —
 * a chave secreta nunca deve ir para o navegador.
 */
export async function callAdminUsers<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("Banco de dados não configurado.");
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("Sessão expirada. Faça login novamente.");
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro na operação (${res.status})`);
  return body as T;
}

export const databaseTables = [
  "stores",
  "users",
  "products",
  "product_manufacturers",
  "product_store_inventory",
  "vehicles",
  "product_vehicle_compatibility",
  "suppliers",
  "customers",
  "purchases",
  "purchase_items",
  "sales",
  "sale_items",
  "stock_movements",
  "price_history",
  "labels",
  "purchase_orders",
  "audit_logs",
] as const;
