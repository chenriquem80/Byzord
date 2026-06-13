import { useEffect, useRef, useState } from "react";
import { Camera, Eye, Pencil, RefreshCw, Trash2, Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/database";

type AttendanceRecord = {
  id: string;
  plate: string;
  store_name: string | null;
  service_title: string | null;
  billing_type: string | null;
  executing_employee: string | null;
  observations: string | null;
  vehicle_photo_url: string | null;
  status: string;
  created_at: string;
};

function formatPlate(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  let result = "";
  for (let i = 0; i < cleaned.length; i++) {
    result += cleaned[i];
    if (i === 2 && cleaned.length > 3) result += "-";
  }
  return result;
}

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColor: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-slate-100 text-slate-500",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function AttendanceQueryPage() {
  const [plate, setPlate] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Atendimentos abertos hoje
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  async function fetchToday() {
    if (!supabase) { setLoadingToday(false); return; }
    setLoadingToday(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("pending_attendances")
      .select("*")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    setTodayRecords(data ?? []);
    setLoadingToday(false);
  }

  useEffect(() => { fetchToday(); }, []);

  // Dialog de visualização
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);

  // Dialog de exclusão
  const [deleteRecord, setDeleteRecord] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dialog de edição
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editFields, setEditFields] = useState({ service_title: "", billing_type: "", executing_employee: "", observations: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Foto no dialog de edição
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleSearch() {
    if (!plate.trim()) return;
    setLoading(true);
    setSearched(false);
    if (supabase) {
      const { data } = await supabase
        .from("pending_attendances")
        .select("*")
        .ilike("plate", plate.trim())
        .order("created_at", { ascending: false });
      setRecords(data ?? []);
    } else {
      setRecords([]);
    }
    setSearched(true);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteRecord || !supabase) return;
    setDeleting(true);
    const { error, count } = await supabase
      .from("pending_attendances")
      .delete({ count: "exact" })
      .eq("id", deleteRecord.id);
    setDeleting(false);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    if (count === 0) {
      alert("Exclusão bloqueada pelo banco. Verifique as permissões da tabela (política RLS de DELETE).");
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
    setTodayRecords((prev) => prev.filter((r) => r.id !== deleteRecord.id));
    setDeleteRecord(null);
  }

  function openEdit(record: AttendanceRecord) {
    setEditRecord(record);
    setEditFields({
      service_title: record.service_title ?? "",
      billing_type: record.billing_type ?? "",
      executing_employee: record.executing_employee ?? "",
      observations: record.observations ?? "",
      status: record.status,
    });
    setPhotoPreview(record.vehicle_photo_url ?? null);
    setNewPhotoUrl(null);
    setSaveError(null);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editRecord || !supabase) return;
    setUploadingPhoto(true);
    setPhotoPreview(URL.createObjectURL(file));
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${editRecord.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attendance-photos").upload(path, file, { upsert: true });
    if (error) {
      setSaveError("Erro ao enviar foto: " + error.message);
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("attendance-photos").getPublicUrl(path);
    setNewPhotoUrl(urlData.publicUrl);
    setUploadingPhoto(false);
    e.target.value = "";
  }

  async function handleSaveEdit() {
    if (!editRecord || !supabase) return;
    setSaving(true);
    setSaveError(null);
    const photoUrl = newPhotoUrl ?? editRecord.vehicle_photo_url;
    const { error } = await supabase
      .from("pending_attendances")
      .update({
        service_title: editFields.service_title || null,
        billing_type: editFields.billing_type || null,
        executing_employee: editFields.executing_employee || null,
        observations: editFields.observations || null,
        status: editFields.status,
        vehicle_photo_url: photoUrl ?? null,
      })
      .eq("id", editRecord.id);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    const updated = { ...editFields, vehicle_photo_url: photoUrl ?? null };
    setRecords((prev) => prev.map((r) => r.id === editRecord.id ? { ...r, ...updated } : r));
    setTodayRecords((prev) => prev.map((r) => r.id === editRecord.id ? { ...r, ...updated } : r));
    setEditRecord(null);
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Consulta de atendimentos"
        description="Informe a placa do veículo para ver o histórico de atendimentos."
      >
        <div className="flex gap-3">
          <Input
            value={plate}
            onChange={(e) => setPlate(formatPlate(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ABC-1D23"
            className="h-14 max-w-[180px] text-center text-2xl font-semibold tracking-[0.22em]"
          />
          <Button size="lg" onClick={handleSearch} disabled={loading || !plate.trim()}>
            <Search className="size-4" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Atendimentos de hoje"
        description={loadingToday ? "Carregando..." : `${todayRecords.length} atendimento${todayRecords.length !== 1 ? "s" : ""} registrado${todayRecords.length !== 1 ? "s" : ""} hoje.`}
        action={
          <Button size="sm" variant="outline" onClick={fetchToday} disabled={loadingToday}>
            <RefreshCw className={`size-3.5 ${loadingToday ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      >
        {loadingToday ? (
          <p className="py-4 text-center text-sm text-slate-400">Carregando...</p>
        ) : todayRecords.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nenhum atendimento registrado hoje.</p>
        ) : (
          <div className="space-y-3">
            {todayRecords.map((record) => (
              <div key={record.id} className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4">
                {/* Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold tracking-wider text-slate-900">{record.plate}</span>
                    <Badge className={statusColor[record.status] ?? "bg-slate-100 text-slate-600"}>
                      {statusLabel[record.status] ?? record.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(record.created_at)}
                    {record.store_name ? ` · ${record.store_name}` : ""}
                  </p>
                  <div className="grid gap-0.5 text-sm text-slate-700 pt-1">
                    {record.service_title && <p><span className="font-medium">Serviço:</span> {record.service_title}</p>}
                    {record.billing_type && <p><span className="font-medium">Cobrança:</span> {record.billing_type}</p>}
                    {record.executing_employee && <p><span className="font-medium">Executado por:</span> {record.executing_employee}</p>}
                    {record.observations && <p><span className="font-medium">Obs:</span> {record.observations}</p>}
                  </div>
                </div>
                {/* Foto */}
                {record.vehicle_photo_url && (
                  <img
                    src={record.vehicle_photo_url}
                    alt="Foto do atendimento"
                    className="h-24 w-36 shrink-0 rounded-xl border border-border object-cover shadow-sm cursor-pointer"
                    onClick={() => setViewRecord(record)}
                  />
                )}
                {/* Ações */}
                <div className="shrink-0 flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewRecord(record)}>
                    <Eye className="size-3.5" />
                    Visualizar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                    <Pencil className="size-3.5" />
                    Alterar
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-600 hover:border-rose-300 hover:text-rose-700" onClick={() => setDeleteRecord(record)}>
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {searched && (
        <SectionCard
          title={`Resultados para ${plate}`}
          description={
            records.length === 0
              ? "Nenhum atendimento encontrado para esta placa."
              : `${records.length} atendimento${records.length !== 1 ? "s" : ""} encontrado${records.length !== 1 ? "s" : ""}.`
          }
        >
          {records.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Nenhum registro encontrado para a placa <strong>{plate}</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold tracking-wider text-slate-900">{record.plate}</span>
                        <Badge className={statusColor[record.status] ?? "bg-slate-100 text-slate-600"}>
                          {statusLabel[record.status] ?? record.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatDateTime(record.created_at)}
                        {record.store_name ? ` · ${record.store_name}` : ""}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewRecord(record)}>
                        <Eye className="size-3.5" />
                        Visualizar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                        <Pencil className="size-3.5" />
                        Alterar
                      </Button>
                      <Button size="sm" variant="outline" className="text-rose-600 hover:border-rose-300 hover:text-rose-700" onClick={() => setDeleteRecord(record)}>
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    {record.service_title && <p><span className="font-medium">Serviço:</span> {record.service_title}</p>}
                    {record.billing_type && <p><span className="font-medium">Cobrança:</span> {record.billing_type}</p>}
                    {record.executing_employee && <p><span className="font-medium">Executado por:</span> {record.executing_employee}</p>}
                    {record.observations && <p><span className="font-medium">Obs:</span> {record.observations}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Dialog excluir */}
      <Dialog open={!!deleteRecord} onOpenChange={(open) => { if (!open) setDeleteRecord(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir atendimento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir o atendimento da placa <strong>{deleteRecord?.plate}</strong> de{" "}
            {deleteRecord ? formatDateTime(deleteRecord.created_at) : ""}? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog visualizar */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => { if (!open) setViewRecord(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atendimento — {viewRecord?.plate}</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={statusColor[viewRecord.status] ?? "bg-slate-100 text-slate-600"}>
                  {statusLabel[viewRecord.status] ?? viewRecord.status}
                </Badge>
                <span className="text-slate-500">{formatDateTime(viewRecord.created_at)}</span>
              </div>
              <div className="grid gap-2 rounded-2xl bg-slate-50 p-4">
                {viewRecord.store_name && <p><span className="font-medium text-slate-600">Loja:</span> {viewRecord.store_name}</p>}
                {viewRecord.service_title && <p><span className="font-medium text-slate-600">Serviço:</span> {viewRecord.service_title}</p>}
                {viewRecord.billing_type && <p><span className="font-medium text-slate-600">Cobrança:</span> {viewRecord.billing_type}</p>}
                {viewRecord.executing_employee && <p><span className="font-medium text-slate-600">Executado por:</span> {viewRecord.executing_employee}</p>}
                {viewRecord.observations && <p><span className="font-medium text-slate-600">Observações:</span> {viewRecord.observations}</p>}
              </div>
              {viewRecord.vehicle_photo_url && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Foto do atendimento</p>
                  <img src={viewRecord.vehicle_photo_url} alt="Foto do atendimento" className="h-48 w-full rounded-2xl border border-border object-cover shadow-sm" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editRecord} onOpenChange={(open) => { if (!open) setEditRecord(null); }}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Alterar atendimento — {editRecord?.plate}</DialogTitle>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Status</p>
                <Select value={editFields.status} onChange={(e) => setEditFields((f) => ({ ...f, status: e.target.value }))}>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Serviço</p>
                <Input value={editFields.service_title} onChange={(e) => setEditFields((f) => ({ ...f, service_title: e.target.value }))} placeholder="Nome do serviço" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Tipo de cobrança</p>
                <Select value={editFields.billing_type} onChange={(e) => setEditFields((f) => ({ ...f, billing_type: e.target.value }))}>
                  <option value="">Selecione...</option>
                  <option value="Seguro">Seguro</option>
                  <option value="Particular">Particular</option>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Executado por</p>
                <Input value={editFields.executing_employee} onChange={(e) => setEditFields((f) => ({ ...f, executing_employee: e.target.value }))} placeholder="Nome do funcionário" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">Observações</p>
                <Textarea value={editFields.observations} onChange={(e) => setEditFields((f) => ({ ...f, observations: e.target.value }))} placeholder="Observações adicionais..." />
              </div>

              {/* Foto */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Foto do atendimento</p>
                <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}>
                  <Camera className="size-3.5" />
                  {uploadingPhoto ? "Enviando..." : photoPreview ? "Trocar foto" : "Adicionar foto"}
                </Button>
                {photoPreview && (
                  <img src={photoPreview} alt="Foto do atendimento" className="h-36 w-full rounded-2xl border border-border object-cover shadow-sm" />
                )}
              </div>

              {saveError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">{saveError}</p>}
            </div>
          )}
          {editRecord && (
            <div className="shrink-0 flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <Button variant="outline" onClick={() => setEditRecord(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={saving || uploadingPhoto}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
