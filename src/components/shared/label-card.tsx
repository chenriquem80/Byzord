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
  html, body { width: 10cm; height: 5cm; overflow: hidden; background: #fff; font-family: Arial, sans-serif; color: #0f172a; }
  body { padding: 0.2cm 0.25cm; display: flex; flex-direction: row; gap: 0.2cm; }
  .left { flex: 1; display: flex; flex-direction: column; gap: 0.07cm; overflow: hidden; min-width: 0; }
  .right { width: 2.4cm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .code-row { display: flex; align-items: baseline; gap: 4px; flex-shrink: 0; }
  .code-label { font-size: 7pt; color: #64748b; white-space: nowrap; }
  .code-value { font-size: 10pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap img { height: 1cm; width: auto; display: block; }
  .info { font-size: 10pt; line-height: 1.4; flex: 1; overflow: hidden; }
  .info p { margin: 0; }
  .info .bold { font-weight: 700; }
  .info .sub { font-size: 8pt; color: #475569; }
  .coded-row { font-size: 6pt; font-family: monospace; color: #64748b; flex-shrink: 0; }
  .qr-box { display: flex; border: 1px solid #94a3b8; border-radius: 3px; padding: 0.07cm; }
  .qr-box svg { width: 2.1cm !important; height: 2.1cm !important; }
  .bc-box { flex-shrink: 0; }
  .bc-box svg { width: 100% !important; height: 1.3cm !important; }
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

    // 10cm × 5cm a 96dpi = 378 × 189px
    const pw = window.open("", "_blank", "width=378,height=189,toolbar=0,scrollbars=0,status=0,menubar=0,resizable=0");
    if (!pw) return;

    const yearRange = label.yearRange ? ` ${up(label.yearRange)}` : "";
    const featureLine = [
      label.feature ? up(label.feature) : "",
      label.glassType ? up(label.glassType) : "",
      label.lado ? up(label.lado) : "",
    ].filter(Boolean).join(" · ");
    const supplierLine = [up(label.supplier), up(label.location)].filter(Boolean).join(" / ");

    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${codeValue}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="left">
    <div class="code-row">
      <span class="code-label">CODIGO:</span>
      <span class="code-value">${up(codeValue)}</span>
    </div>
    <div class="info">
      <p>${up(label.vehicleLabel)}${yearRange}</p>
      ${featureLine ? `<p class="bold">${featureLine}</p>` : ""}
      ${supplierLine ? `<p class="sub">${supplierLine}</p>` : ""}
    </div>
    ${label.purchaseSummary ? `<div class="coded-row">${n1}\\00\\${up(label.purchaseSummary)}\\00\\${n2}</div>` : ""}
    ${codeValue && bcSvg ? `<div class="bc-box">${bcSvg}</div>` : ""}
  </div>
  <div class="right">
    <div class="logo-wrap"><img src="${LOGO_URL}" alt="Byzord Auto Vitrais" /></div>
    ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
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
      {/* Preview — proporção 10cm × 5cm (paisagem 2:1) */}
      <div
        className="flex w-full max-w-[400px] flex-row gap-2 rounded-[10px] bg-white p-2.5 text-slate-950 shadow-sm"
        style={{ fontFamily: "Arial, sans-serif", aspectRatio: "2/1" }}
      >
        {/* Coluna esquerda */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="shrink-0 text-[8px] text-slate-500">CODIGO:</span>
            <span className="break-all text-[11px] font-bold leading-tight">{up(codeValue)}</span>
          </div>
          <div className="flex-1 overflow-hidden text-[10px] leading-snug text-slate-800 space-y-px">
            <p>{up(label.vehicleLabel)}{label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
            {(label.feature || label.glassType) && (
              <p className="font-bold">
                {[label.feature, label.glassType, label.lado]
                  .filter(Boolean).map(up).join(" · ")}
              </p>
            )}
            {(label.supplier || label.location) && (
              <p className="text-[8px] text-slate-500">
                {[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>
          {label.purchaseSummary && (
            <div className="shrink-0 font-mono text-[6px] text-slate-400">
              {n1}\00\{up(label.purchaseSummary)}\00\{n2}
            </div>
          )}
          {codeValue && (
            <div ref={bcWrapRef} className="shrink-0 w-full">
              <Barcode value={codeValue} format="CODE128" width={1.1} height={32} fontSize={6} margin={1} />
            </div>
          )}
        </div>
        {/* Coluna direita: logo + QR */}
        <div className="flex w-[82px] shrink-0 flex-col items-center justify-between">
          <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-[30px] w-auto object-contain" />
          <div ref={qrWrapRef} className="rounded border border-slate-300 p-0.5">
            <QRCodeSVG value={codeValue} size={62} level="M" includeMargin={false} />
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full max-w-[400px] gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
