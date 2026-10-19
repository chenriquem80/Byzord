import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/database";
import {
  AGENDA_COLUMNS,
  AgendaEntryItem,
  NoStoreNotice,
  formatIsoDate,
  type AgendaEntry,
} from "./agenda-shared";

export function AgendaQueryPage() {
  const { user: authUser } = useAuth();
  const storeId = authUser?.storeId ?? null;
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    if (!supabase || !storeId) return;
    setLoading(true);
    let query = supabase
      .from("agenda")
      .select(AGENDA_COLUMNS)
      .eq("store_id", storeId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });
    const term = text.trim();
    // Escapa curingas do LIKE para buscar o texto literalmente
    if (term) query = query.ilike("description", `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    if (date) query = query.eq("event_date", date);
    const { data, error: fetchErr } = await query;
    if (fetchErr) setError(`Erro ao consultar agenda: ${fetchErr.message}`);
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => { handleSearch(); }, [storeId]);

  function handleClear() {
    setText("");
    setDate("");
  }

  async function handleDelete(entry: AgendaEntry) {
    if (!supabase) return;
    if (!window.confirm(`Excluir o registro de ${formatIsoDate(entry.event_date)}?`)) return;
    const { error: delErr } = await supabase.from("agenda").delete().eq("id", entry.id);
    if (delErr) { setError(`Erro ao excluir: ${delErr.message}`); return; }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }

  if (!storeId) {
    return <SectionCard title="Consulta da Agenda"><NoStoreNotice /></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Consulta da Agenda" description={`Unidade: ${authUser?.storeName ?? ""}`}>
        <form
          className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <FormField label="Texto na descrição">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite parte da descrição..." />
          </FormField>
          <FormField label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Search className="size-4" />
              Buscar
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>Limpar</Button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </SectionCard>

      <SectionCard
        title="Resultados"
        description={`${entries.length} registro${entries.length !== 1 ? "s" : ""} encontrado${entries.length !== 1 ? "s" : ""}.`}
      >
        {loading ? (
          <p className="text-sm text-slate-500">Buscando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro encontrado.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <AgendaEntryItem
                key={entry.id}
                entry={entry}
                onEdit={(e) => navigate("/app/agenda", { state: { editEntry: e } })}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
