import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X } from "lucide-react";
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

/** Diálogo com a câmera traseira lendo QR code / código de barras. Chama onScan uma vez por leitura. */
export function QrScannerDialog({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let done = false;

    async function start() {
      setError(null);
      // Aguarda o dialog estar montado no DOM
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (w: number, h: number) => {
              const side = Math.floor(Math.min(w, h) * 0.75);
              return { width: side, height: side };
            },
          },
          (code) => {
            if (cancelled || done) return;
            done = true;
            onScanRef.current(code);
          },
          () => {},
        );
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
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) safeStop(scanner);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5" />
            Ler QR code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div id={READER_ID} className="overflow-hidden rounded-2xl" />
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          ) : (
            <p className="text-center text-sm text-slate-500">Aponte a câmera para o QR code da etiqueta</p>
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
