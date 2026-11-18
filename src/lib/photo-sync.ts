// Sincronização de fotos de atendimento: lê as fotos do dia de uma pasta (fotos salvas do grupo
// "Fotos" do WhatsApp), identifica o número do atendimento escrito na lousa e copia cada foto
// para uma subpasta com esse número dentro da própria pasta do grupo.
// Usa a File System Access API (Chrome/Edge no computador).
import { supabase } from "@/lib/database";

/* ---------- Tipos mínimos da File System Access API ---------- */

type PermissionMode = "read" | "readwrite";

export interface DirHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<DirHandle | FileHandle>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandle>;
  queryPermission(desc: { mode: PermissionMode }): Promise<PermissionState>;
  requestPermission(desc: { mode: PermissionMode }): Promise<PermissionState>;
}

export interface FileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob | string): Promise<void>; close(): Promise<void> }>;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(id: string): Promise<DirHandle | null> {
  try {
    const picker = (window as unknown as {
      showDirectoryPicker: (opts: { id?: string; mode?: PermissionMode }) => Promise<DirHandle>;
    }).showDirectoryPicker;
    return await picker({ id, mode: "readwrite" });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return null;
    throw err;
  }
}

/** Garante permissão na pasta (o navegador pode pedir confirmação ao usuário). */
export async function ensurePermission(handle: DirHandle, mode: PermissionMode): Promise<boolean> {
  if ((await handle.queryPermission({ mode })) === "granted") return true;
  return (await handle.requestPermission({ mode })) === "granted";
}

/* ---------- Pastas salvas (IndexedDB, por navegador/computador) ---------- */

export type FolderKey = "source" | "destination";

const DB_NAME = "byzord-photo-sync";
const STORE = "handles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFolder(key: FolderKey, handle: DirHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadFolder(key: FolderKey): Promise<DirHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<DirHandle | null>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as DirHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

/* ---------- Fotos do dia ---------- */

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export type PhotoEntry = {
  handle: FileHandle;
  file: File;
  /** Momento da foto: horário do nome do WhatsApp ("... at 09.58.12") ou data de modificação */
  takenAt: number;
  key: string;
};

function sameDay(ts: number, day: string): boolean {
  const d = new Date(ts);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return iso === day;
}

/** "WhatsApp Image 2026-11-18 at 09.58.12 (1).jpeg" → timestamp da foto */
function timeFromWhatsAppName(name: string): number | null {
  const m = name.match(/(\d{4})-(\d{2})-(\d{2}) at (\d{1,2})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

/** Fotos da pasta de origem cuja data (nome do WhatsApp ou modificação) é o dia informado (AAAA-MM-DD). */
export async function listPhotosOfDay(dir: DirHandle, day: string): Promise<PhotoEntry[]> {
  const photos: PhotoEntry[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind !== "file" || !IMAGE_EXT.test(entry.name)) continue;
    const file = await entry.getFile();
    const takenAt = timeFromWhatsAppName(entry.name) ?? file.lastModified;
    if (!sameDay(takenAt, day)) continue;
    photos.push({ handle: entry, file, takenAt, key: `${entry.name}|${file.size}|${file.lastModified}` });
  }
  // Ordem em que as fotos foram tiradas/enviadas; desempate pelo nome ("(1)", "(2)"...)
  return photos.sort((a, b) => a.takenAt - b.takenAt || a.handle.name.localeCompare(b.handle.name, undefined, { numeric: true }));
}

/* ---------- Leitura da lousa (Claude, via Edge Function) ---------- */

export type BoardReading = {
  hasBoard: boolean;
  serviceNumber: string;
  plate: string;
  date: string;
  confidence: "high" | "low" | "none";
};

/** Reduz a foto (lado maior 1568px) e devolve JPEG em base64 — menor custo e envio mais rápido. */
async function toJpegBase64(file: File, maxSide = 1568): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export async function readBoard(file: File): Promise<BoardReading> {
  if (!supabase) throw new Error("Banco de dados não configurado.");
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("Sessão expirada. Faça login novamente.");
  const image = await toJpegBase64(file);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/read-photo-number`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ image, mediaType: "image/jpeg" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro ao analisar foto (${res.status})`);
  return body as BoardReading;
}

/* ---------- Registro do que já foi processado (fica na pasta do grupo) ---------- */

const MANIFEST = ".byzord-fotos.json";

export type ManifestItem = {
  folder: string;
  /** Nome com que a foto foi salva na pasta do atendimento (ex: 20576401-03.jpeg) */
  fileName?: string;
  serviceNumber: string;
  plate: string;
  at: number;
};
export type Manifest = {
  /** Fotos já analisadas, para não reenviar à IA numa nova sincronização */
  processed: Record<string, ManifestItem>;
};

export async function loadManifest(dest: DirHandle): Promise<Manifest> {
  try {
    const fh = await dest.getFileHandle(MANIFEST);
    const parsed = JSON.parse(await (await fh.getFile()).text());
    return { processed: parsed.processed ?? {} };
  } catch {
    return { processed: {} };
  }
}

export async function saveManifest(dest: DirHandle, manifest: Manifest): Promise<void> {
  const fh = await dest.getFileHandle(MANIFEST, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(manifest, null, 2));
  await w.close();
}

/* ---------- Agrupamento ---------- */

/** Quantos dígitos diferem (mesmo tamanho); números de tamanhos diferentes contam como muito diferentes. */
function digitDiff(a: string, b: string): number {
  if (a.length !== b.length) return 99;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff;
}

export type Assignment = {
  folder: string;
  reason: "numero" | "mesma-placa" | "anterior" | "sem-numero";
};

/**
 * Decide a pasta de cada foto, na ordem:
 * - foto com número → pasta do número (nova pasta quando o número muda);
 *   leitura que difere em até 2 dígitos do atendimento atual com a mesma placa é tratada
 *   como o mesmo atendimento (evita pasta duplicada por erro de leitura da letra de mão);
 * - foto sem número → pasta da foto anterior;
 * - sem foto anterior → pasta "SEM NUMERO <data>".
 */
export function assignFolder(
  reading: BoardReading,
  current: { folder: string; plate: string } | null,
  day: string,
): { assignment: Assignment; current: { folder: string; plate: string } | null } {
  const number = reading.serviceNumber;
  if (number) {
    if (current && current.folder !== number && reading.plate && reading.plate === current.plate
        && digitDiff(number, current.folder) <= 2) {
      return { assignment: { folder: current.folder, reason: "mesma-placa" }, current };
    }
    const plate = reading.plate || (current?.folder === number ? current.plate : "");
    return { assignment: { folder: number, reason: "numero" }, current: { folder: number, plate } };
  }
  if (current) return { assignment: { folder: current.folder, reason: "anterior" }, current };
  const [y, m, d] = day.split("-");
  return { assignment: { folder: `SEM NUMERO ${d}-${m}-${y}`, reason: "sem-numero" }, current: null };
}

/* ---------- Cópia com nome sequencial ---------- */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Numeração das fotos dentro de cada pasta de atendimento: <pasta>-01, <pasta>-02, ...
 * Na primeira foto de cada pasta, continua a partir do maior número que já existe nela
 * (fotos de sincronizações anteriores).
 */
export class PhotoNamer {
  private next = new Map<string, number>();

  async nextName(dir: DirHandle, folder: string, originalName: string): Promise<string> {
    if (!this.next.has(folder)) {
      const pattern = new RegExp(`^${escapeRegex(folder)}-(\\d+)\\.`, "i");
      let max = 0;
      for await (const entry of dir.values()) {
        const m = entry.kind === "file" ? entry.name.match(pattern) : null;
        if (m) max = Math.max(max, Number(m[1]));
      }
      this.next.set(folder, max + 1);
    }
    const n = this.next.get(folder)!;
    this.next.set(folder, n + 1);
    const ext = (originalName.match(/\.[^.]+$/)?.[0] ?? ".jpg").toLowerCase();
    return `${folder}-${String(n).padStart(2, "0")}${ext}`;
  }
}

/** Copia a foto para destino/pasta com o próximo nome da sequência. Retorna o nome usado. */
export async function copyPhoto(dest: DirHandle, folder: string, photo: PhotoEntry, namer: PhotoNamer): Promise<string> {
  const dir = await dest.getDirectoryHandle(folder, { create: true });
  const fileName = await namer.nextName(dir, folder, photo.handle.name);
  const fh = await dir.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(photo.file);
  await w.close();
  return fileName;
}
