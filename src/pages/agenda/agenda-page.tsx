import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/database";
import { usePermissions } from "@/hooks/use-permissions";
import { ReadOnlyNotice } from "@/components/shared/read-only-notice";
import {
  AGENDA_COLUMNS,
  AgendaEntryItem,
  NoStoreNotice,
  formatIsoDate,
  todayIso,
  useAgendaStores,
  type AgendaEntry,
} from "./agenda-shared";

export function AgendaPage() {
  const { user: authUser } = useAuth();
  const storeId = authUser?.storeId ?? null;
  const isAdmin = authUser?.role === "ADMIN";
  const stores = useAgendaStores(isAdmin);
  const location = useLocation();
  const navigate = useNavigate();
  const { readOnly } = usePermissions();

  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const [eventDate, setEventDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [micExplainerOpen, setMicExplainerOpen] = useState(false);
  const [micGranting, setMicGranting] = useState(false);

  function startRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Reconhecimento de voz não suportado neste navegador."); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as SpeechRecognitionResultList)
        .slice(e.resultIndex)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .toUpperCase();
      setDescription((prev) => prev + (prev.endsWith(" ") || prev.endsWith("\n") || prev === "" ? "" : " ") + transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }

  async function toggleMic() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    // Se já autorizou antes, começa direto
    try {
      if (localStorage.getItem("micPermGranted") === "true") { startRecognition(); return; }
    } catch {}
    // Verifica via Permissions API
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (status.state === "granted") {
          try { localStorage.setItem("micPermGranted", "true"); } catch {}
          startRecognition();
          return;
        }
      }
    } catch {}
    // Primeira vez: mostra explicação antes de pedir permissão
    setMicExplainerOpen(true);
  }

  async function grantMicPermission() {
    setMicGranting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      try { localStorage.setItem("micPermGranted", "true"); } catch {}
      setMicExplainerOpen(false);
      startRecognition();
    } catch {
      setMicExplainerOpen(false);
      // tenta mesmo assim — SpeechRecognition vai lidar com o erro
      startRecognition();
    } finally {
      setMicGranting(false);
    }
  }
  // Unidade do registro: fixa na loja do usuário; administrador pode escolher
  const [formStoreId, setFormStoreId] = useState(storeId ?? "");

  useEffect(() => {
    if (!formStoreId) setFormStoreId(storeId ?? stores[0]?.id ?? "");
  }, [storeId, stores]);

  // Edição vinda da tela de Consulta
  useEffect(() => {
    const entry = (location.state as { editEntry?: AgendaEntry } | null)?.editEntry;
    if (entry && !readOnly) {
      startEdit(entry);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);

  async function fetchEntries(date: string) {
    setLoading(true);
    if (!supabase || (!storeId && !isAdmin) || !date) { setEntries([]); setLoading(false); return; }
    let query = supabase
      .from("agenda")
      .select(AGENDA_COLUMNS)
      .eq("event_date", date)
      .order("created_at", { ascending: true });
    // Administrador vê todas as unidades
    if (!isAdmin) query = query.eq("store_id", storeId);
    const { data, error: fetchErr } = await query;
    if (fetchErr) setError(`Erro ao carregar agenda: ${fetchErr.message}`);
    setEntries((data ?? []) as unknown as AgendaEntry[]);
    setLoading(false);
  }

  useEffect(() => { fetchEntries(eventDate); }, [eventDate, storeId, isAdmin]);

  function resetForm() {
    setDescription("");
    setEditingId(null);
    setFormStoreId(storeId ?? stores[0]?.id ?? "");
  }

  function startEdit(entry: AgendaEntry) {
    if (entry.description.startsWith("**** ORÇAMENTO ****")) {
      const body = entry.description.replace(/^\*\*\*\* ORÇAMENTO \*\*\*\*\n?/, "");
      navigate("/app/imprimir-orcamento", { state: { body } });
      return;
    }
    if (entry.description.startsWith("**** ENCOMENDA ****")) {
      const lines = entry.description.replace(/^\*\*\*\* ENCOMENDA \*\*\*\*\n?/, "").split("\n");
      const arrivalLine = lines.find((l) => l.startsWith("Previsão de chegada:"));
      const descText = lines.filter((l) => !l.startsWith("Previsão de chegada:")).join("\n").trim();
      const arrivalBR = arrivalLine?.replace("Previsão de chegada: ", "").trim() ?? "";
      const arrivalIso = arrivalBR ? arrivalBR.split("/").reverse().join("-") : "";
      navigate("/app/encomenda", { state: { editDescription: descText, editArrivalDate: arrivalIso, editOrderDate: entry.event_date } });
      return;
    }
    setEditingId(entry.id);
    setEventDate(entry.event_date);
    setDescription(entry.description);
    if (entry.store_id) setFormStoreId(entry.store_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    setError(null);
    if (!eventDate) { setError("Informe a data."); return; }
    if (!description.trim()) { setError("Informe a descrição."); return; }
    if (!supabase) { setError("Banco de dados não configurado."); return; }
    if (!formStoreId) { setError(isAdmin ? "Selecione a unidade." : "Seu usuário não está vinculado a nenhuma unidade."); return; }

    setSaving(true);
    const payload = { event_date: eventDate, description: description.trim(), store_id: formStoreId };
    const { error: saveErr } = editingId
      ? await supabase.from("agenda").update(payload).eq("id", editingId)
      : await supabase.from("agenda").insert({ ...payload, user_name: authUser?.name ?? "" });
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

  if (!storeId && !isAdmin) {
    return <SectionCard title="Agenda"><NoStoreNotice /></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={editingId ? "Editar registro" : "Agenda"}
        description={isAdmin ? "Administrador — acesso a todas as unidades" : `Unidade: ${authUser?.storeName ?? ""}`}
        action={savedMessage ? <span className="text-sm font-medium text-emerald-600">Salvo com sucesso!</span> : null}
      >
        <div className="space-y-4">
          {readOnly && <ReadOnlyNotice />}
          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField label="Data" className="sm:w-56">
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </FormField>
            {isAdmin && (
              <FormField label="Unidade" className="sm:w-56">
                <Select value={formStoreId} onChange={(e) => setFormStoreId(e.target.value)} placeholder="Selecione...">
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </Select>
              </FormField>
            )}
          </div>
          {!readOnly && (<>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Parar gravação" : "Ditar texto"}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                listening
                  ? "animate-pulse bg-rose-500 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {listening ? "Parar" : "Ditar"}
            </button>
            {listening && <span className="text-xs text-rose-500">Ouvindo...</span>}
          </div>
          <FormField label="Descrição">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.toUpperCase())}
              placeholder="Descreva o compromisso ou anotação..."
              className="min-h-48 uppercase"
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
          </>)}
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
              <AgendaEntryItem key={entry.id} entry={entry} onEdit={readOnly ? undefined : startEdit} onDelete={readOnly ? undefined : handleDelete} showStore={isAdmin} />
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Explicação de permissão de microfone (exibida apenas na primeira vez) */}
      <Dialog open={micExplainerOpen} onOpenChange={(open) => { if (!open) setMicExplainerOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="size-5" />
              Permitir acesso ao microfone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Para usar a função de ditado, o aplicativo precisa acessar o microfone do seu dispositivo.
            </p>
            <p className="text-sm text-slate-500">
              Quando o navegador perguntar, selecione <strong>Permitir</strong>. Essa confirmação só será solicitada uma vez.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={grantMicPermission} disabled={micGranting}>
                <Mic className="size-4" />
                {micGranting ? "Aguardando…" : "Permitir microfone"}
              </Button>
              <Button variant="outline" onClick={() => setMicExplainerOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
