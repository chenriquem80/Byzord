import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const READER_ID = "html5qr-dialog-reader";

function safeStop(scanner: Html5Qrcode) {
  try {
    scanner.stop()
      .then(() => { try { scanner.clear(); } catch {} })
      .catch(() => { try { scanner.clear(); } catch {} });
  } catch {
    try { scanner.clear(); } catch {}
  }
}

const DEFAULT_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

/** Diálogo com a câmera traseira lendo QR code / código de barras. Chama onScan uma vez por leitura. */
export function QrScannerDialog({
  open,
  onClose,
  onScan,
  title = "Ler QR code",
  hint = "Aponte a câmera para o QR code da etiqueta",
  formats = DEFAULT_FORMATS,
  wide = false,
  accept,
  videoDecoder,
  photoDecoder,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  hint?: string;
  formats?: Html5QrcodeSupportedFormats[];
  /** Área de leitura larga e câmera em alta resolução (código de barras comprido, ex: boleto) */
  wide?: boolean;
  /** Aceita a leitura só se passar neste teste (leituras parciais são ignoradas) */
  accept?: (code: string) => boolean;
  /** Leitor extra aplicado aos quadros do vídeo em resolução cheia */
  videoDecoder?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => string | null;
  /** Leitura a partir de uma foto (mostra o botão "Tirar foto do código") */
  photoDecoder?: (file: File) => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  function deliver(code: string) {
    if (doneRef.current) return;
    if (accept && !accept(code)) return;
    doneRef.current = true;
    onScanRef.current(code);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let frameTimer: number | undefined;
    doneRef.current = false;
    setPhotoError(null);

    async function start() {
      setError(null);
      // Aguarda o dialog estar montado no DOM
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false,
          formatsToSupport: formats,
          // Leitor nativo do aparelho quando existir (Android/Chrome) — bem mais rápido e preciso
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            // no boleto o leitor próprio (videoDecoder) faz o trabalho pesado; o padrão roda devagar
            fps: wide ? 3 : 15,
            qrbox: (w: number, h: number) => {
              if (wide) return { width: Math.floor(w * 0.95), height: Math.max(60, Math.floor(h * 0.3)) };
              const side = Math.floor(Math.min(w, h) * 0.75);
              return { width: side, height: side };
            },
            // Código de barras de boleto é fino: pede resolução alta e foco contínuo
            ...(wide ? {
              videoConstraints: {
                facingMode: "environment",
                width: { ideal: 3840 },
                height: { ideal: 2160 },
                advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
              },
            } : {}),
          },
          (code) => { if (!cancelled) deliver(code); },
          () => {},
        );

        // Leitor extra nos quadros do vídeo em resolução cheia
        if (videoDecoder) {
          const canvas = document.createElement("canvas");
          const tick = () => {
            if (cancelled || doneRef.current) return;
            const video = document.querySelector<HTMLVideoElement>(`#${READER_ID} video`);
            if (video && video.videoWidth > 0) {
              try {
                const found = videoDecoder(video, canvas);
                if (found) { deliver(found); return; }
              } catch { /* quadro inválido: tenta no próximo */ }
            }
            frameTimer = window.setTimeout(tick, 120);
          };
          frameTimer = window.setTimeout(tick, 500);
        }
      } catch (err: any) {
        if (cancelled) return;
        const name = (err as Error)?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError" || err?.message?.includes("permission")) {
          setError("Câmera bloqueada. Permita o acesso à câmera nas configurações do navegador (no iPhone: Ajustes → Safari → Câmera).");
        } else if (name === "NotFoundError") {
          setError("Nenhuma câmera encontrada neste dispositivo.");
        } else {
          setError("Não foi possível iniciar a câmera.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (frameTimer) window.clearTimeout(frameTimer);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) safeStop(scanner);
    };
  }, [open]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !photoDecoder) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const code = await photoDecoder(file);
      if (code && (!accept || accept(code))) deliver(code);
      else setPhotoError("Não consegui ler o código na foto. Tire de novo bem de perto, com o código de barras reto e ocupando a foto de lado a lado, com boa luz e sem reflexo.");
    } catch {
      setPhotoError("Não foi possível abrir a foto.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div id={READER_ID} className="overflow-hidden rounded-2xl" />
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          ) : (
            <p className="text-center text-sm text-slate-500">{hint}</p>
          )}
          {photoDecoder && (
            <>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              <Button className="w-full" onClick={() => photoInputRef.current?.click()} disabled={photoBusy}>
                <ImagePlus className="size-4" />
                {photoBusy ? "Lendo a foto..." : "Tirar foto do código"}
              </Button>
              {photoError && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{photoError}</p>}
            </>
          )}
          <Button variant="outline" className="w-full" onClick={onClose}>
            <X className="size-4" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
