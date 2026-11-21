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
