import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/database";
import { usePermissions } from "@/hooks/use-permissions";
import {
  AGENDA_COLUMNS,
  AgendaEntryItem,
  NoStoreNotice,
  formatIsoDate,
  todayIso,
  useAgendaStores,
  type AgendaEntry,
} from "./agenda-shared";

export function AgendaQueryPage() {
  const { user: authUser } = useAuth();
  const storeId = authUser?.storeId ?? null;
  const isAdmin = authUser?.role === "ADMIN";
  const stores = useAgendaStores(isAdmin);
  const navigate = useNavigate();
  const { readOnly, canEdit } = usePermissions();
  // Editar abre a tela Anotar, então exige alteração nas duas abas
  const canEditEntries = !readOnly && canEdit("/app/agenda");

  const [text, setText] = useState("");
  // Abre sempre com a agenda do dia
  const [date, setDate] = useState(todayIso());
  const [searchedDate, setSearchedDate] = useState(todayIso());
  const [storeFilter, setStoreFilter] = useState(""); // "" = todas (apenas administrador)
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    if (!supabase || (!storeId && !isAdmin)) return;
    setLoading(true);
    let query = supabase
      .from("agenda")
      .select(AGENDA_COLUMNS)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("store_id", storeId);
    else if (storeFilter) query = query.eq("store_id", storeFilter);
    const term = text.trim();
    // Escapa curingas do LIKE para buscar o texto literalmente
    if (term) query = query.ilike("description", `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    if (date) query = query.eq("event_date", date);
    const { data, error: fetchErr } = await query;
    if (fetchErr) setError(`Erro ao consultar agenda: ${fetchErr.message}`);
    setEntries((data ?? []) as unknown as AgendaEntry[]);
    setSearchedDate(date);
    setLoading(false);
  }

  useEffect(() => { handleSearch(); }, [storeId, isAdmin]);

  function handleClear() {
    setText("");
    setDate(todayIso());
    setStoreFilter("");
  }

  async function handleDelete(entry: AgendaEntry) {
    if (!supabase) return;
    if (!window.confirm(`Excluir o registro de ${formatIsoDate(entry.event_date)}?`)) return;
    const { error: delErr } = await supabase.from("agenda").delete().eq("id", entry.id);
    if (delErr) { setError(`Erro ao excluir: ${delErr.message}`); return; }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }

  // Administrador vendo todas as unidades: resultados separados por unidade
  const groupByStore = isAdmin && !storeFilter;
  const storeGroups: { id: string; name: string; items: AgendaEntry[] }[] = [];
  if (groupByStore) {
    // Todas as unidades aparecem (mesmo sem registros); depois, unidades só presentes nos registros
    for (const store of stores) storeGroups.push({ id: store.id, name: store.name, items: [] });
    for (const entry of entries) {
      const id = entry.store_id ?? "_none";
      let group = storeGroups.find((g) => g.id === id);
      if (!group) {
        group = { id, name: entry.stores?.name ?? "Sem unidade", items: [] };
        storeGroups.push(group);
      }
      group.items.push(entry);
    }
  }

  function handleEdit(entry: AgendaEntry) {
    if (entry.description.startsWith("**** ORÇAMENTO ****")) {
      const body = entry.description.replace(/^\*\*\*\* ORÇAMENTO \*\*\*\*\n?/, "");
      navigate("/app/imprimir-orcamento", { state: { body } });
    } else if (entry.description.startsWith("**** ENCOMENDA ****")) {
      navigate("/app/encomenda");
    } else {
      navigate("/app/agenda", { state: { editEntry: entry } });
    }
  }

  function renderEntries(list: AgendaEntry[], showStore: boolean) {
    return (
      <ul className="space-y-3">
        {list.map((entry) => (
          <AgendaEntryItem
            key={entry.id}
            entry={entry}
            onEdit={canEditEntries ? handleEdit : undefined}
            onDelete={readOnly ? undefined : handleDelete}
            showStore={showStore}
          />
        ))}
      </ul>
    );
  }

  if (!storeId && !isAdmin) {
    return <SectionCard title="Consulta da Agenda"><NoStoreNotice /></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Consulta da Agenda"
        description={isAdmin ? "Administrador — acesso a todas as unidades" : `Unidade: ${authUser?.storeName ?? ""}`}
      >
        <form
          className={`grid gap-4 md:items-end ${isAdmin ? "md:grid-cols-[1fr_200px_200px_auto]" : "md:grid-cols-[1fr_220px_auto]"}`}
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <FormField label="Texto na descrição">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite parte da descrição..." />
          </FormField>
          <FormField label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          {isAdmin && (
            <FormField label="Unidade">
              <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="">Todas as unidades</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </Select>
            </FormField>
          )}
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
        title={searchedDate ? `Agenda de ${formatIsoDate(searchedDate)}` : "Resultados"}
        description={`${entries.length} registro${entries.length !== 1 ? "s" : ""} encontrado${entries.length !== 1 ? "s" : ""}.`}
      >
        {loading ? (
          <p className="text-sm text-slate-500">Buscando...</p>
        ) : groupByStore ? (
          <div className="space-y-6">
            {storeGroups.map((group) => (
              <section key={group.id} className="rounded-2xl border border-border bg-slate-50/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                  {group.name}
                  <span className="text-sm font-normal text-slate-500">
                    — {group.items.length} registro{group.items.length !== 1 ? "s" : ""}
                  </span>
                </h3>
                {group.items.length === 0
                  ? <p className="text-sm text-slate-500">Nenhum registro.</p>
                  : renderEntries(group.items, false)}
              </section>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro encontrado.</p>
        ) : (
          renderEntries(entries, isAdmin)
        )}
      </SectionCard>
    </div>
  );
}
