import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, FolderOpen, RefreshCcw } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  type Assignment,
  type BoardReading,
  type PhotoEntry,
  assignFolder,
  copyPhoto,
  ensurePermission,
  isFileSystemAccessSupported,
  listPhotosOfDay,
  loadFolder,
  loadManifest,
  readBoard,
  saveManifest,
} from "@/lib/photo-sync";

type RowStatus = "aguardando" | "analisando" | "copiada" | "ja-existia" | "erro";

type Row = {
  key: string;
  name: string;
  time: string;
  reading?: BoardReading;
  assignment?: Assignment;
  status: RowStatus;
  error?: string;
};

const ANALYZE_CONCURRENCY = 3;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const REASON_LABEL: Record<Assignment["reason"], string> = {
  numero: "Número da lousa",
  "mesma-placa": "Mesma placa do atendimento anterior",
  anterior: "Sem lousa — junto com a foto anterior",
  "sem-numero": "Sem lousa e sem foto anterior",
};

const STATUS_LABEL: Record<RowStatus, { text: string; className: string }> = {
  aguardando: { text: "Aguardando", className: "bg-slate-100 text-slate-500" },
  analisando: { text: "Analisando...", className: "bg-sky-100 text-sky-700" },
  copiada: { text: "Copiada", className: "bg-emerald-100 text-emerald-700" },
  "ja-existia": { text: "Já estava na pasta", className: "bg-slate-100 text-slate-600" },
  erro: { text: "Erro", className: "bg-rose-100 text-rose-700" },
};

export function PhotosSyncPage() {
  const supported = isFileSystemAccessSupported();
  const [day, setDay] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const done = rows.filter((r) => r.status === "copiada" || r.status === "ja-existia" || r.status === "erro").length;

  const folderSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) if (r.assignment && r.status !== "erro") map.set(r.assignment.folder, (map.get(r.assignment.folder) ?? 0) + 1);
    return [...map.entries()];
  }, [rows]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleSync() {
    setMessage(null);
    setRows([]);
    const [source, dest] = await Promise.all([loadFolder("source"), loadFolder("destination")]);
    if (!source || !dest) {
      setMessage({ type: "error", text: "Escolha as pastas de origem e de destino em Fotos → Local de salvamento." });
      return;
    }
    setRunning(true);
    try {
      if (!(await ensurePermission(source, "read")) || !(await ensurePermission(dest, "readwrite"))) {
        throw new Error("Permissão para acessar as pastas foi negada.");
      }
      const photos = await listPhotosOfDay(source, day);
      if (photos.length === 0) {
        setMessage({ type: "error", text: `Nenhuma foto do dia ${day.split("-").reverse().join("/")} na pasta "${source.name}".` });
        return;
      }
      setRows(photos.map((p) => ({
        key: p.key,
        name: p.handle.name,
        time: new Date(p.takenAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        status: "aguardando",
      })));

      const manifest = await loadManifest(dest);

      // 1) Lê a lousa das fotos ainda não analisadas (algumas em paralelo)
      const readings = new Map<string, BoardReading>();
      const failed = new Map<string, string>();
      for (const p of photos) {
        const saved = manifest.processed[p.key];
        if (saved) readings.set(p.key, { hasBoard: !!saved.serviceNumber, serviceNumber: saved.serviceNumber, plate: saved.plate, date: "", confidence: saved.serviceNumber ? "high" : "none" });
      }
      const pending = photos.filter((p) => !readings.has(p.key));
      let next = 0;
      async function worker() {
        while (next < pending.length) {
          const photo: PhotoEntry = pending[next++];
          updateRow(photo.key, { status: "analisando" });
          try {
            const reading = await readBoard(photo.file);
            readings.set(photo.key, reading);
            updateRow(photo.key, { reading });
          } catch (err) {
            failed.set(photo.key, (err as Error)?.message ?? "Erro ao analisar");
            updateRow(photo.key, { status: "erro", error: (err as Error)?.message });
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(ANALYZE_CONCURRENCY, pending.length) }, worker));

      // 2) Na ordem das fotos, decide a pasta e copia
      let current: { folder: string; plate: string } | null = null;
      // Depois de uma foto que falhou, as fotos sem lousa podem ser de outro atendimento:
      // ficam para a próxima sincronização, até aparecer uma foto com número.
      let blocked = false;
      for (const photo of photos) {
        const reading = readings.get(photo.key);
        if (!reading) { blocked = true; continue; }
        if (blocked && !reading.serviceNumber) {
          failed.set(photo.key, "bloqueada");
          updateRow(photo.key, { reading, status: "erro", error: "Não copiada: a foto anterior não pôde ser analisada." });
          continue;
        }
        blocked = false;
        const result = assignFolder(reading, current, day);
        current = result.current;
        try {
          const copied = await copyPhoto(dest, result.assignment.folder, photo);
          manifest.processed[photo.key] = {
            folder: result.assignment.folder,
            serviceNumber: reading.serviceNumber,
            plate: reading.plate,
            at: Date.now(),
          };
          updateRow(photo.key, { reading, assignment: result.assignment, status: copied ? "copiada" : "ja-existia" });
        } catch (err) {
          updateRow(photo.key, { reading, assignment: result.assignment, status: "erro", error: (err as Error)?.message });
        }
      }
      await saveManifest(dest, manifest);

      const failures = failed.size;
      setMessage(failures > 0
        ? { type: "error", text: `${photos.length - failures} foto(s) organizadas; ${failures} não foram copiadas por erro na análise. Sincronize de novo para tentar outra vez.` }
        : { type: "ok", text: `${photos.length} foto(s) organizadas em "${dest.name}".` });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error)?.message ?? "Erro na sincronização." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Fotos — Sincronização"
        description="Busca as fotos do dia na pasta do grupo Fotos, lê o número do atendimento na lousa e separa cada atendimento numa pasta."
        action={
          <Button onClick={handleSync} disabled={!supported || running} className="gap-2">
            <RefreshCcw className={`size-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Sincronizando..." : "Sincronizar"}
          </Button>
        }
      >
        {!supported && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>Este navegador não permite acessar pastas do computador. Use o Google Chrome ou o Microsoft Edge no computador.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
          <FormField label="Dia das fotos">
            <Input type="date" value={day} max={todayIso()} onChange={(e) => setDay(e.target.value)} disabled={running} />
          </FormField>
          <p className="text-sm text-slate-500">
            As pastas são definidas em <Link to="/app/fotos-config" className="font-medium text-primary hover:underline">Local de salvamento</Link>.
            Fotos já organizadas não são analisadas de novo.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-primary transition-all" style={{ width: `${(done / rows.length) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{done} de {rows.length} foto(s)</p>
          </div>
        )}

        {message && (
          <p className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {message.text}
          </p>
        )}
      </SectionCard>

      {folderSummary.length > 0 && (
        <SectionCard title="Pastas dos atendimentos">
          <div className="flex flex-wrap gap-2">
            {folderSummary.map(([folder, count]) => (
              <span key={folder} className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-sm shadow-sm">
                <FolderOpen className="size-4 text-primary" />
                <span className="font-semibold text-slate-900">{folder}</span>
                <span className="text-slate-500">({count})</span>
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {rows.length > 0 && (
        <SectionCard title="Fotos do dia">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Hora</th>
                  <th className="py-2 pr-3">Foto</th>
                  <th className="py-2 pr-3">Lido na lousa</th>
                  <th className="py-2 pr-3">Pasta</th>
                  <th className="py-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key} className="align-top">
                    <td className="py-2 pr-3 font-mono text-xs text-slate-500">{r.time}</td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-slate-700" title={r.name}>{r.name}</td>
                    <td className="py-2 pr-3">
                      {r.reading?.serviceNumber ? (
                        <span className="font-semibold text-slate-900">
                          {r.reading.serviceNumber}
                          {r.reading.plate ? <span className="ml-1 font-normal text-slate-500">· {r.reading.plate}</span> : null}
                          {r.reading.confidence === "low" && (
                            <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">conferir</span>
                          )}
                        </span>
                      ) : r.reading ? <span className="text-slate-400">Sem lousa</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 pr-3">
                      {r.assignment ? (
                        <>
                          <p className="font-medium text-slate-800">{r.assignment.folder}</p>
                          <p className="text-xs text-slate-400">{REASON_LABEL[r.assignment.reason]}</p>
                        </>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_LABEL[r.status].className}`}>
                        {STATUS_LABEL[r.status].text}
                      </span>
                      {r.error && <p className="mt-1 text-xs text-rose-600">{r.error}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
