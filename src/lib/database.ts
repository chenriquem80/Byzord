import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no .env");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
