import { useRef } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = `${window.location.origin}/logo.png`;

const up = (value?: string | null) => (value ?? "").toLocaleUpperCase("pt-BR");

export function noiseDigits(seed: string, count: number, salt: number): string {
  const s = seed.replace(/\D/g, "").padStart(10, "0") + salt;
  let h = salt * 2654435761;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    out += h % 10;
  }
  return out;
}

export const PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 10cm 5cm; margin: 0; }
  html, body { width: 10cm; height: 5cm; background: #fff; font-family: sans-serif; color: #0f172a; overflow: hidden; }
  body { padding: 0.25cm 0.35cm; display: flex; flex-direction: column; justify-content: space-between; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.3cm; }
  .code-row { display: flex; align-items: baseline; gap: 3px; }
  .code-label { font-size: 6pt; color: #64748b; white-space: nowrap; flex-shrink: 0; }
  .code-value { font-size: 8.5pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap img { height: 1.1cm; width: auto; display: block; }
  .info { font-size: 9pt; line-height: 1.45; flex: 1; margin: 0.1cm 0; }
  .info p { margin: 0; }
  .info .sub { font-size: 7.5pt; color: #475569; }
  .coded-row { font-size: 6pt; font-family: monospace; color: #64748b; }
  .bottom { display: flex; align-items: center; gap: 0.25cm; }
  .qr-box { display: flex; align-items: center; border: 1px solid #94a3b8; border-radius: 3px; padding: 0.1cm; flex-shrink: 0; }
  .qr-box svg { width: 1.4cm !important; height: 1.4cm !important; }
  .bc-box { flex: 1; display: flex; align-items: center; }
  .bc-box svg { width: 100% !important; height: 1.2cm !important; }
`;

export type LabelData = {
  productCode: string;
  vehicleLabel: string;
  yearRange?: string;
  feature?: string;
  lado?: string | null;
  glassType?: string;
  manufacturer?: string;
  supplier?: string;
  location?: string;
  purchaseSummary?: string;
};

export function LabelCard({ label, wrapperClassName }: { label: LabelData; wrapperClassName?: string }) {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const bcWrapRef = useRef<HTMLDivElement>(null);

  const codeValue = label.productCode;
  const n1 = noiseDigits(codeValue, 7, 1);
  const n2 = noiseDigits(codeValue, 8, 2);

  function handlePrint() {
    const qrSvg = qrWrapRef.current?.querySelector("svg")?.outerHTML ?? "";
    const bcSvg = bcWrapRef.current?.querySelector("svg")?.outerHTML ?? "";

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${codeValue}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="code-row">
        <span class="code-label">CODIGO:</span>
        <span class="code-value">${up(codeValue)}</span>
      </div>
    </div>
    <div class="logo-wrap">
      <img src="${LOGO_URL}" alt="Byzord Auto Vitrais" />
    </div>
  </div>
  <div class="info">
    <p>${up(label.vehicleLabel)}${label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
    ${label.feature ? `<p>${up(label.feature)}${label.glassType ? ` · ${up(label.glassType)}` : ""}${label.lado ? ` - ${up(label.lado)}` : ""}${label.manufacturer ? ` · ${up(label.manufacturer)}` : ""}</p>` : ""}
    ${(label.supplier || label.location) ? `<p class="sub">${[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}</p>` : ""}
  </div>
  ${label.purchaseSummary ? `<div class="coded-row">${n1}\\00\\${up(label.purchaseSummary)}\\00\\${n2}</div>` : ""}
  <div class="bottom">
    ${codeValue && bcSvg ? `<div class="bc-box">${bcSvg}</div>` : ""}
    ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
  </div>
</body>
</html>`);

    doc.close();
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }

  return (
    <div className={wrapperClassName ?? "flex flex-col items-center gap-3"}>
      {/* Preview — proporção 10cm × 5cm (paisagem 2:1) */}
      <div className="flex w-full max-w-[380px] flex-col justify-between rounded-[14px] bg-white px-3 pb-3 pt-2 text-slate-950 shadow-sm" style={{ aspectRatio: "2/1" }}>
        {/* Header: código (esq) + logo (dir) */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="shrink-0 text-[9px] font-medium text-slate-500">CODIGO:</span>
            <span className="break-all text-[12px] font-bold leading-tight tracking-tight">{up(codeValue)}</span>
          </div>
          <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-7 w-auto object-contain" />
        </div>
        {/* Info */}
        <div className="flex-1 space-y-0.5 py-1 text-[11px] leading-snug text-slate-800">
          <p>{up(label.vehicleLabel)}{label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
          {label.feature && (
            <p>{up(label.feature)}{label.glassType ? ` · ${up(label.glassType)}` : ""}{label.lado ? ` - ${up(label.lado)}` : ""}{label.manufacturer ? ` · ${up(label.manufacturer)}` : ""}</p>
          )}
          {(label.supplier || label.location) && (
            <p className="text-[9px] text-slate-500">
              {[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        {/* Coded row */}
        {label.purchaseSummary && (
          <div className="font-mono text-[7px] text-slate-400">
            {n1}\00\{up(label.purchaseSummary)}\00\{n2}
          </div>
        )}
        {/* Bottom: barcode (flex:1) + QR (direita) */}
        <div className="flex items-center gap-2">
          {codeValue && (
            <div ref={bcWrapRef} className="min-w-0 flex-1">
              <Barcode value={codeValue} format="CODE128" width={1.2} height={28} fontSize={7} margin={2} />
            </div>
          )}
          <div ref={qrWrapRef} className="shrink-0 rounded border border-slate-300 p-0.5">
            <QRCodeSVG value={codeValue} size={34} level="M" includeMargin={false} />
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full max-w-[380px] gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
