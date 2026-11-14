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
  body { padding: 0.2cm 0.3cm; display: flex; flex-direction: column; page-break-inside: avoid; break-inside: avoid; }
  .main { display: flex; flex: 1; gap: 0.2cm; min-height: 0; }
  .left { flex: 1; display: flex; flex-direction: column; gap: 0.07cm; overflow: hidden; }
  .right { width: 1.9cm; display: flex; flex-direction: column; align-items: center; gap: 0.1cm; flex-shrink: 0; }
  .code-row { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
  .code-label { font-size: 5.5pt; color: #64748b; white-space: nowrap; }
  .code-value { font-size: 8.5pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap img { height: 0.9cm; width: auto; display: block; }
  .info { font-size: 9pt; line-height: 1.4; flex: 1; overflow: hidden; }
  .info p { margin: 0; }
  .info .sub { font-size: 7.5pt; color: #475569; }
  .qr-box { display: flex; border: 1px solid #94a3b8; border-radius: 2px; padding: 0.06cm; }
  .qr-box svg { width: 1.4cm !important; height: 1.4cm !important; }
  .bottom { flex-shrink: 0; margin-top: 0.05cm; }
  .coded-row { font-size: 5pt; font-family: monospace; color: #64748b; margin-bottom: 0.03cm; }
  .bc-box { width: 100%; }
  .bc-box svg { width: 100% !important; height: 1.0cm !important; }
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

    // Abre popup com dimensões exatas: 10cm x 5cm a 96dpi ≈ 378 x 189px
    const pw = window.open("", "_blank", "width=378,height=189,toolbar=0,scrollbars=0,status=0,menubar=0,resizable=0");
    if (!pw) return;

    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${codeValue}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="main">
    <div class="left">
      <div class="code-row">
        <span class="code-label">CODIGO:</span>
        <span class="code-value">${up(codeValue)}</span>
      </div>
      <div class="info">
        <p>${up(label.vehicleLabel)}${label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
        ${label.feature ? `<p>${up(label.feature)}${label.glassType ? ` · ${up(label.glassType)}` : ""}${label.lado ? ` - ${up(label.lado)}` : ""}</p>` : ""}
        ${(label.supplier || label.location) ? `<p class="sub">${[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}</p>` : ""}
      </div>
    </div>
    <div class="right">
      <div class="logo-wrap"><img src="${LOGO_URL}" alt="Byzord Auto Vitrais" /></div>
      ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
    </div>
  </div>
  <div class="bottom">
    ${label.purchaseSummary ? `<div class="coded-row">${n1}\\00\\${up(label.purchaseSummary)}\\00\\${n2}</div>` : ""}
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
      {/* Preview — proporção 10cm × 5cm (paisagem 2:1) */}
      <div
        className="flex w-full max-w-[400px] flex-col rounded-[12px] bg-white p-3 text-slate-950 shadow-sm"
        style={{ aspectRatio: "2/1", fontFamily: "Arial, sans-serif" }}
      >
        {/* Linha principal: info (esq) + logo+QR (dir) */}
        <div className="flex min-h-0 flex-1 gap-2">
          {/* Coluna esquerda */}
          <div className="flex flex-1 flex-col gap-1 overflow-hidden">
            <div className="flex items-baseline gap-1">
              <span className="shrink-0 text-[8px] text-slate-500">CODIGO:</span>
              <span className="break-all text-[11px] font-bold leading-tight">{up(codeValue)}</span>
            </div>
            <div className="space-y-px text-[11px] leading-snug text-slate-800">
              <p>{up(label.vehicleLabel)}{label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
              {label.feature && (
                <p>{up(label.feature)}{label.glassType ? ` · ${up(label.glassType)}` : ""}{label.lado ? ` - ${up(label.lado)}` : ""}</p>
              )}
              {(label.supplier || label.location) && (
                <p className="text-[9px] text-slate-500">
                  {[up(label.supplier), up(label.location)].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          </div>
          {/* Coluna direita: logo + QR */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-6 w-auto object-contain" />
            <div ref={qrWrapRef} className="rounded border border-slate-300 p-0.5">
              <QRCodeSVG value={codeValue} size={44} level="M" includeMargin={false} />
            </div>
          </div>
        </div>
        {/* Rodapé: coded-row + barcode largura total */}
        <div className="mt-1 shrink-0">
          {label.purchaseSummary && (
            <div className="font-mono text-[6px] text-slate-400">
              {n1}\00\{up(label.purchaseSummary)}\00\{n2}
            </div>
          )}
          {codeValue && (
            <div ref={bcWrapRef} className="w-full">
              <Barcode value={codeValue} format="CODE128" width={1.2} height={28} fontSize={7} margin={2} />
            </div>
          )}
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full max-w-[400px] gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
