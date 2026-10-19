import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/database";
import {
  AGENDA_COLUMNS,
  AgendaEntryItem,
  NoStoreNotice,
  formatIsoDate,
  todayIso,
  type AgendaEntry,
} from "./agenda-shared";

export function AgendaPage() {
  const { user: authUser } = useAuth();
  const storeId = authUser?.storeId ?? null;
  const location = useLocation();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const [eventDate, setEventDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edição vinda da tela de Consulta
  useEffect(() => {
    const entry = (location.state as { editEntry?: AgendaEntry } | null)?.editEntry;
    if (entry) {
      startEdit(entry);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);

  async function fetchEntries(date: string) {
    setLoading(true);
    if (!supabase || !storeId || !date) { setEntries([]); setLoading(false); return; }
    const { data, error: fetchErr } = await supabase
      .from("agenda")
      .select(AGENDA_COLUMNS)
      .eq("store_id", storeId)
      .eq("event_date", date)
      .order("created_at", { ascending: true });
    if (fetchErr) setError(`Erro ao carregar agenda: ${fetchErr.message}`);
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchEntries(eventDate); }, [eventDate, storeId]);

  function resetForm() {
    setDescription("");
    setEditingId(null);
  }

  function startEdit(entry: AgendaEntry) {
    setEditingId(entry.id);
    setEventDate(entry.event_date);
    setDescription(entry.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    setError(null);
    if (!eventDate) { setError("Informe a data."); return; }
    if (!description.trim()) { setError("Informe a descrição."); return; }
    if (!supabase) { setError("Banco de dados não configurado."); return; }
    if (!storeId) { setError("Seu usuário não está vinculado a nenhuma unidade."); return; }

    setSaving(true);
    const payload = { event_date: eventDate, description: description.trim() };
    const { error: saveErr } = editingId
      ? await supabase.from("agenda").update(payload).eq("id", editingId)
      : await supabase.from("agenda").insert({ ...payload, store_id: storeId, user_name: authUser?.name ?? "" });
    setSaving(false);

    if (saveErr) { setError(`Erro ao salvar: ${saveErr.message}`); return; }
    resetForm();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
    fetchEntries(eventDate);
  }

  async function handleDelete(entry: AgendaEntry) {
    if (!supabase) return;
    if (!window.confirm(`Excluir o registro de ${formatIsoDate(entry.event_date)}?`)) return;
    const { error: delErr } = await supabase.from("agenda").delete().eq("id", entry.id);
    if (delErr) { setError(`Erro ao excluir: ${delErr.message}`); return; }
    if (editingId === entry.id) resetForm();
    fetchEntries(eventDate);
  }

  if (!storeId) {
    return <SectionCard title="Agenda"><NoStoreNotice /></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={editingId ? "Editar registro" : "Agenda"}
        description={`Unidade: ${authUser?.storeName ?? ""}`}
        action={savedMessage ? <span className="text-sm font-medium text-emerald-600">Salvo com sucesso!</span> : null}
      >
        <div className="space-y-4">
          <FormField label="Data" className="max-w-xs">
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </FormField>
          <FormField label="Descrição">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o compromisso ou anotação..."
              className="min-h-48"
            />
          </FormField>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm} disabled={saving}>Cancelar</Button>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`Registros de ${eventDate ? formatIsoDate(eventDate) : "-"}`}
        description={`${entries.length} registro${entries.length !== 1 ? "s" : ""} nesta data.`}
      >
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro nesta data.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <AgendaEntryItem key={entry.id} entry={entry} onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
