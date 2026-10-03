import { useRef } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = `${window.location.origin}/logo.png`;

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
  @page { size: 10cm 15cm; margin: 0; }
  html, body { width: 10cm; height: 15cm; background: #fff; font-family: sans-serif; color: #0f172a; overflow: hidden; }
  body { padding: 0.4cm; display: flex; flex-direction: column; justify-content: space-between; }
  .code-row { display: flex; align-items: baseline; gap: 6px; }
  .code-label { font-size: 9pt; color: #64748b; white-space: nowrap; flex-shrink: 0; }
  .code-value { font-size: 13pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap { display: flex; justify-content: center; }
  .logo-wrap img { height: 2.2cm; width: auto; display: block; }
  .info { font-size: 15pt; line-height: 1.75; }
  .info p { margin: 0; }
  .coded-row { font-size: 10pt; font-family: monospace; }
  .qr-box { display: flex; justify-content: center; align-items: center; border: 1px solid #94a3b8; border-radius: 6px; padding: 0.1cm; }
  .qr-box svg { width: 2cm !important; height: 2cm !important; }
  .bc-box { display: flex; justify-content: center; }
  .bc-box svg { width: 8.2cm !important; height: 1.4cm !important; }
`;

export type LabelData = {
  productCode: string;
  vehicleLabel: string;
  yearRange?: string;
  feature?: string;
  lado?: string | null;
  glassType?: string;
  manufacturer?: string;
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

    const printWindow = window.open("", "_blank", "width=420,height=600");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${codeValue}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="code-row">
    <span class="code-label">Codigo:</span>
    <span class="code-value">${codeValue}</span>
  </div>
  <div class="logo-wrap">
    <img src="${LOGO_URL}" alt="Byzord Auto Vitrais" />
  </div>
  <div class="info">
    <p>${label.vehicleLabel.toLowerCase()}</p>
    ${label.yearRange ? `<p>${label.yearRange}</p>` : ""}
    ${label.feature ? `<p>${label.feature}${label.lado ? ` - ${label.lado}` : ""}</p>` : ""}
    ${label.glassType ? `<p>${label.glassType.toLowerCase()}</p>` : ""}
    ${label.manufacturer ? `<p>${label.manufacturer}</p>` : ""}
  </div>
  ${label.purchaseSummary ? `<div class="coded-row">${n1}\\00\\${label.purchaseSummary}\\00\\${n2}</div>` : ""}
  ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
  ${codeValue && bcSvg ? `<div class="bc-box">${bcSvg}</div>` : ""}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <div className={wrapperClassName ?? "flex flex-col items-center gap-3"}>
      <div className="flex w-full max-w-[260px] flex-col justify-between rounded-[18px] bg-white px-4 pb-4 pt-3 text-slate-950 shadow-sm">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-[11px] font-medium text-slate-500">Codigo:</span>
          <span className="break-all text-[15px] font-bold leading-tight tracking-tight">{codeValue}</span>
        </div>
        <div className="mt-2 flex justify-center">
          <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-14 w-auto object-contain" />
        </div>
        <div className="mt-3 space-y-1 text-[15px] leading-relaxed text-slate-800">
          <p>{label.vehicleLabel.toLowerCase()}</p>
          {label.yearRange && <p>{label.yearRange}</p>}
          {label.feature && <p>{label.feature}{label.lado ? ` - ${label.lado}` : ""}</p>}
          {label.glassType && <p>{label.glassType.toLowerCase()}</p>}
          {label.manufacturer && <p>{label.manufacturer}</p>}
        </div>
        {label.purchaseSummary && (
          <div className="mt-2 font-mono text-[11px]">
            {n1}\00\{label.purchaseSummary}\00\{n2}
          </div>
        )}
        <div ref={qrWrapRef} className="mt-3 flex justify-center rounded-md border border-slate-300 p-1">
          <QRCodeSVG value={codeValue} size={40} level="M" includeMargin={false} />
        </div>
        {codeValue && (
          <div ref={bcWrapRef} className="mt-2 flex justify-center">
            <Barcode value={codeValue} format="CODE128" width={1.1} height={36} fontSize={10} margin={0} />
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full max-w-[260px] gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
