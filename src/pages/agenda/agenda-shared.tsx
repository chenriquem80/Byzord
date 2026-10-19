import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/database";

export type AgendaEntry = {
  id: string;
  event_date: string;
  description: string;
  user_name: string | null;
  created_at: string;
  store_id: string | null;
  stores: { name: string } | null;
};

export const AGENDA_COLUMNS = "id, event_date, description, user_name, created_at, store_id, stores (name)";

export type AgendaStore = { id: string; name: string };

// Lista de unidades — carregada apenas para administradores, que acessam todas
export function useAgendaStores(enabled: boolean): AgendaStore[] {
  const [stores, setStores] = useState<AgendaStore[]>([]);
  useEffect(() => {
    if (!enabled || !supabase) return;
    supabase.from("stores").select("id, name").order("name").then(({ data }) => setStores(data ?? []));
  }, [enabled]);
  return stores;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// event_date vem como "YYYY-MM-DD"; formata sem passar por Date para evitar desvio de fuso
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(y, m - 1, d));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)).replace(",", "");
}

export function AgendaEntryItem({
  entry,
  onEdit,
  onDelete,
  showStore = false,
}: {
  entry: AgendaEntry;
  onEdit: (entry: AgendaEntry) => void;
  onDelete: (entry: AgendaEntry) => void;
  showStore?: boolean;
}) {
  return (
    <li className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarDays className="size-4 text-primary" />
          {formatIsoDate(entry.event_date)}
          <span className="font-normal capitalize text-slate-500">{weekdayLabel(entry.event_date)}</span>
          {showStore && (
            <Badge className="bg-primary/10 text-primary">{entry.stores?.name ?? "Sem unidade"}</Badge>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(entry)} aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(entry)} aria-label="Excluir">
            <Trash2 className="size-4 text-danger" />
          </Button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{entry.description}</p>
      <p className="mt-2 text-xs text-slate-400">
        Registrado{entry.user_name ? ` por ${entry.user_name}` : ""} em {formatDateTime(entry.created_at)}
      </p>
    </li>
  );
}

export function NoStoreNotice() {
  return (
    <p className="text-sm text-slate-500">
      Seu usuário não está vinculado a nenhuma unidade. Peça a um administrador para definir sua loja.
    </p>
  );
}
