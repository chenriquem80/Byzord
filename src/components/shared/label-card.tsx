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
  @page { size: 5cm 10cm; margin: 0; }
  html, body { width: 5cm; height: 10cm; overflow: hidden; background: #fff; font-family: Arial, sans-serif; color: #0f172a; }
  body { padding: 0.2cm 0.25cm; display: flex; flex-direction: column; gap: 0.15cm; page-break-inside: avoid; break-inside: avoid; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.1cm; flex-shrink: 0; }
  .code-row { display: flex; align-items: baseline; gap: 3px; }
  .code-label { font-size: 5pt; color: #64748b; white-space: nowrap; }
  .code-value { font-size: 7pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap img { height: 0.9cm; width: auto; display: block; }
  .info { font-size: 9pt; line-height: 1.4; }
  .info p { margin: 0; }
  .info .sub { font-size: 7.5pt; color: #475569; }
  .coded-row { font-size: 5.5pt; font-family: monospace; color: #64748b; flex-shrink: 0; }
  .bottom { display: flex; flex-direction: column; align-items: center; gap: 0.1cm; flex-shrink: 0; }
  .qr-box { display: flex; border: 1px solid #94a3b8; border-radius: 3px; padding: 0.08cm; }
  .qr-box svg { width: 1.6cm !important; height: 1.6cm !important; }
  .bc-box { width: 100%; }
  .bc-box svg { width: 100% !important; height: 1.1cm !important; }
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

    // Abre popup com dimensões exatas: 5cm x 10cm a 96dpi ≈ 189 x 378px (retrato)
    const pw = window.open("", "_blank", "width=189,height=378,toolbar=0,scrollbars=0,status=0,menubar=0,resizable=0");
    if (!pw) return;

    const yearRange = label.yearRange ? ` ${up(label.yearRange)}` : "";
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${codeValue}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="header">
    <div class="code-row">
      <span class="code-label">CODIGO:</span>
      <span class="code-value">${up(codeValue)}</span>
    </div>
    <div class="logo-wrap"><img src="${LOGO_URL}" alt="Byzord Auto Vitrais" /></div>
  </div>
  <div class="info">
    <p>${up(label.vehicleLabel)}${yearRange}</p>
    ${label.feature ? `<p>${up(label.feature)}${label.glassType ? ` · ${up(label.glassType)}` : ""}${label.lado ? ` - ${up(label.lado)}` : ""}</p>` : ""}
    ${(label.supplier || label.location) ? `<p class="sub">${[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}</p>` : ""}
  </div>
  ${label.purchaseSummary ? `<div class="coded-row">${n1}\\00\\${up(label.purchaseSummary)}\\00\\${n2}</div>` : ""}
  <div class="bottom">
    ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
    ${codeValue && bcSvg ? `<div class="bc-box">${bcSvg}</div>` : ""}
  </div>
</body>
</html>`);

    pw.document.close();
    pw.focus();
    pw.addEventListener("afterprint", () => pw.close());
    setTimeout(() => pw.print(), 500);
  }

  return (
    <div className={wrapperClassName ?? "flex flex-col items-center gap-3"}>
      {/* Preview — proporção 5cm × 10cm (retrato 1:2) */}
      <div
        className="flex w-[190px] flex-col gap-1.5 rounded-[10px] bg-white p-2.5 text-slate-950 shadow-sm"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Cabeçalho: código (esq) + logo (dir) */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-baseline gap-1">
            <span className="shrink-0 text-[7px] text-slate-500">CODIGO:</span>
            <span className="break-all text-[9px] font-bold leading-tight">{up(codeValue)}</span>
          </div>
          <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-[22px] w-auto shrink-0 object-contain" />
        </div>
        {/* Info */}
        <div className="space-y-px text-[10px] leading-snug text-slate-800">
          <p>{up(label.vehicleLabel)}{label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
          {label.feature && (
            <p>{up(label.feature)}{label.glassType ? ` · ${up(label.glassType)}` : ""}{label.lado ? ` - ${up(label.lado)}` : ""}</p>
          )}
          {(label.supplier || label.location) && (
            <p className="text-[8px] text-slate-500">
              {[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        {/* Coded row */}
        {label.purchaseSummary && (
          <div className="font-mono text-[6px] text-slate-400">
            {n1}\00\{up(label.purchaseSummary)}\00\{n2}
          </div>
        )}
        {/* QR + barcode centralizados */}
        <div className="flex flex-col items-center gap-1">
          <div ref={qrWrapRef} className="rounded border border-slate-300 p-1">
            <QRCodeSVG value={codeValue} size={60} level="M" includeMargin={false} />
          </div>
          {codeValue && (
            <div ref={bcWrapRef} className="w-full">
              <Barcode value={codeValue} format="CODE128" width={1.1} height={28} fontSize={7} margin={2} />
            </div>
          )}
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-[190px] gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
