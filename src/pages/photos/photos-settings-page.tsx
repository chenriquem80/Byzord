import { useEffect, useState } from "react";
import { FolderOpen, FolderInput, FolderOutput, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import {
  type DirHandle,
  type FolderKey,
  isFileSystemAccessSupported,
  loadFolder,
  pickDirectory,
  saveFolder,
} from "@/lib/photo-sync";

const FOLDERS: { key: FolderKey; title: string; description: string; icon: typeof FolderInput }[] = [
  {
    key: "destination",
    title: "Onde salvar as fotos",
    description: "Pasta onde serão criadas as subpastas de cada atendimento (uma pasta por número).",
    icon: FolderOutput,
  },
  {
    key: "source",
    title: "Fotos do grupo do WhatsApp",
    description: "Pasta onde você salva as fotos do grupo \"Fotos\" do WhatsApp. A sincronização lê dela as fotos do dia.",
    icon: FolderInput,
  },
];

export function PhotosSettingsPage() {
  const supported = isFileSystemAccessSupported();
  const [folders, setFolders] = useState<Record<FolderKey, DirHandle | null>>({ source: null, destination: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    Promise.all([loadFolder("source"), loadFolder("destination")]).then(([source, destination]) =>
      setFolders({ source, destination }),
    );
  }, [supported]);

  async function choose(key: FolderKey) {
    setError(null);
    try {
      const handle = await pickDirectory(`byzord-${key}`);
      if (!handle) return;
      await saveFolder(key, handle);
      setFolders((prev) => ({ ...prev, [key]: handle }));
    } catch (err) {
      setError((err as Error)?.message ?? "Não foi possível acessar a pasta.");
    }
  }

  return (
    <SectionCard
      title="Fotos — Local de salvamento"
      description="Escolha as pastas usadas pela sincronização. A escolha fica salva neste navegador e neste computador."
    >
      {!supported && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Este navegador não permite acessar pastas do computador. Use o Google Chrome ou o Microsoft Edge no computador.</p>
        </div>
      )}
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {FOLDERS.map(({ key, title, description, icon: Icon }) => (
          <div key={key} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icon className="size-5 text-primary" />
              <p className="font-semibold text-slate-900">{title}</p>
            </div>
            <p className="text-sm text-slate-500">{description}</p>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <FolderOpen className="size-4 shrink-0 text-slate-400" />
              {folders[key]
                ? <span className="truncate font-medium text-slate-800">{folders[key]!.name}</span>
                : <span className="text-slate-400">Nenhuma pasta escolhida</span>}
            </div>
            <Button variant="outline" onClick={() => choose(key)} disabled={!supported}>
              {folders[key] ? "Trocar pasta" : "Escolher pasta"}
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
