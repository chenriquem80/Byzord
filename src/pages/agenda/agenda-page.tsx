import { CalendarDays, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/database";

type AgendaEntry = {
  id: string;
  event_date: string;
  description: string;
  user_name: string | null;
  created_at: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// event_date vem como "YYYY-MM-DD"; formata sem passar por Date para evitar desvio de fuso
function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(y, m - 1, d));
}

export function AgendaPage() {
  const { user: authUser } = useAuth();
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const [eventDate, setEventDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function fetchEntries() {
    setLoading(true);
    if (!supabase) { setLoading(false); return; }
    const { data, error: fetchErr } = await supabase
      .from("agenda")
      .select("id, event_date, description, user_name, created_at")
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (fetchErr) setError(`Erro ao carregar agenda: ${fetchErr.message}`);
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchEntries(); }, []);

  function resetForm() {
    setEventDate(todayIso());
    setDescription("");
    setEditingId(null);
  }

  async function handleSave() {
    setError(null);
    if (!eventDate) { setError("Informe a data."); return; }
    if (!description.trim()) { setError("Informe a descrição."); return; }
    if (!supabase) { setError("Banco de dados não configurado."); return; }

    setSaving(true);
    const payload = { event_date: eventDate, description: description.trim() };
    const { error: saveErr } = editingId
      ? await supabase.from("agenda").update(payload).eq("id", editingId)
      : await supabase.from("agenda").insert({ ...payload, user_name: authUser?.name ?? "" });
    setSaving(false);

    if (saveErr) { setError(`Erro ao salvar: ${saveErr.message}`); return; }
    resetForm();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
    fetchEntries();
  }

  function handleEdit(entry: AgendaEntry) {
    setEditingId(entry.id);
    setEventDate(entry.event_date);
    setDescription(entry.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(entry: AgendaEntry) {
    if (!supabase) return;
    if (!window.confirm(`Excluir o registro de ${formatIsoDate(entry.event_date)}?`)) return;
    const { error: delErr } = await supabase.from("agenda").delete().eq("id", entry.id);
    if (delErr) { setError(`Erro ao excluir: ${delErr.message}`); return; }
    if (editingId === entry.id) resetForm();
    fetchEntries();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={editingId ? "Editar registro" : "Agenda"}
        description="Registre compromissos e anotações por data."
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
        title="Registros"
        description={`${entries.length} registro${entries.length !== 1 ? "s" : ""} na agenda.`}
        action={
          <Button size="sm" variant="outline" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro na agenda.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CalendarDays className="size-4 text-primary" />
                    {formatIsoDate(entry.event_date)}
                    <span className="font-normal capitalize text-slate-500">{weekdayLabel(entry.event_date)}</span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)} aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(entry)} aria-label="Excluir">
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{entry.description}</p>
                {entry.user_name && <p className="mt-2 text-xs text-slate-400">Registrado por {entry.user_name}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
