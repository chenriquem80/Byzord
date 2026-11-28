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
  body { padding: 0.2cm 0.25cm; display: flex; flex-direction: row-reverse; gap: 0.2cm; }
  .left { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.07cm; overflow: hidden; min-width: 0; }
  .right { width: 2.7cm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .code-row { display: flex; align-items: baseline; gap: 4px; flex-shrink: 0; }
  .code-label { font-size: 7pt; color: #64748b; white-space: nowrap; }
  .code-value { font-size: 10pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap img { height: 1cm; width: auto; display: block; }
  .info { font-size: 10pt; line-height: 1.4; flex: 1; overflow: hidden; text-align: center; }
  .info p { margin: 0; }
  .info .name { font-size: 13pt; font-weight: 700; line-height: 1.15; }
  .info .bold { font-weight: 700; }
  .info .sub { font-size: 8pt; color: #475569; }
  .coded-row { font-size: 8pt; font-family: monospace; color: #64748b; flex-shrink: 0; text-align: center; }
  .variant-row { display: flex; gap: 0.12cm; justify-content: center; }
  .variant-tag { font-size: 11pt; font-weight: 700; line-height: 1; border: 1px solid #0f172a; border-radius: 3px; padding: 0.05cm 0.12cm; }
  .qr-box { display: flex; border: 1px solid #94a3b8; border-radius: 3px; padding: 0.07cm; }
  .qr-box svg { width: 2.4cm !important; height: 2.4cm !important; }
  .bc-box { flex-shrink: 0; align-self: stretch; }
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
  /** Condição especial do estoque (B, R, BR) — vai apenas no QR code */
  specialCondition?: string | null;
};

// QR code identifica o item exato do estoque: produto + fabricante + lado + condição especial.
// Formato: BYZ1|<código>|<fabricante>|<lado>|<condição> (campos com encodeURIComponent)
const QR_PREFIX = "BYZ1";

export function buildLabelQrValue(label: Pick<LabelData, "productCode" | "manufacturer" | "lado" | "specialCondition">): string {
  return [QR_PREFIX, label.productCode, label.manufacturer, label.lado, label.specialCondition]
    .map((v, i) => (i === 0 ? v : encodeURIComponent(v ?? "")))
    .join("|");
}

export type ParsedLabelQr = {
  productCode: string;
  manufacturer: string | null;
  lado: string | null;
  specialCondition: string | null;
};

/** Lê o QR das etiquetas novas; retorna null para códigos simples (etiquetas antigas / código de barras). */
export function parseLabelQr(raw: string): ParsedLabelQr | null {
  const parts = raw.trim().split("|");
  if (parts[0] !== QR_PREFIX || parts.length < 2) return null;
  const dec = (v?: string) => {
    if (!v) return null;
    try { return decodeURIComponent(v) || null; } catch { return v; }
  };
  return {
    productCode: dec(parts[1]) ?? "",
    manufacturer: dec(parts[2]),
    lado: dec(parts[3]),
    specialCondition: dec(parts[4]),
  };
}

export function LabelCard({ label, wrapperClassName, onPrint }: {
  label: LabelData;
  wrapperClassName?: string;
  /** Chamado quando a impressão é aberta (não é chamado se o navegador bloquear a janela) */
  onPrint?: () => void;
}) {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const bcWrapRef = useRef<HTMLDivElement>(null);

  const codeValue = label.productCode;
  const n1 = noiseDigits(codeValue, 7, 1);
  const n2 = noiseDigits(codeValue, 8, 2);
  // Condição especial (B, R, BR) e lado (A, D, E) — só as letras, entre o logo e o QR
  const variantTags = [label.specialCondition, label.lado].map((v) => up(v).trim()).filter(Boolean);

  function handlePrint() {
    const qrSvg = qrWrapRef.current?.querySelector("svg")?.outerHTML ?? "";
    const bcSvg = bcWrapRef.current?.querySelector("svg")?.outerHTML ?? "";

    const yearRange = label.yearRange ? ` ${up(label.yearRange)}` : "";
    const featureLine = [
      label.glassType ? up(label.glassType) : "",
      label.feature ? up(label.feature) : "",
      label.manufacturer ? up(label.manufacturer) : "",
    ].filter(Boolean).join(" · ");
    const variantHtml = variantTags.length > 0
      ? `<div class="variant-row">${variantTags.map((t) => `<span class="variant-tag">${t}</span>`).join("")}</div>`
      : "";
    const supplierLine = [up(label.supplier), up(label.location)].filter(Boolean).join(" / ");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      <p class="name">${up(label.vehicleLabel)}${yearRange}</p>
      ${featureLine ? `<p class="bold">${featureLine}</p>` : ""}
      ${supplierLine ? `<p class="sub">${supplierLine}</p>` : ""}
    </div>
    ${label.purchaseSummary ? `<div class="coded-row">${n1}\\00\\${up(label.purchaseSummary)}\\00\\${n2}</div>` : ""}
    ${codeValue && bcSvg ? `<div class="bc-box">${bcSvg}</div>` : ""}
  </div>
  <div class="right">
    <div class="logo-wrap"><img src="${LOGO_URL}" alt="Byzord Auto Vitrais" /></div>
    ${variantHtml}
    ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
  </div>
</body>
</html>`;

    // iOS Safari não suporta window.open para impressão — usa iframe oculto
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (!doc) { document.body.removeChild(iframe); return; }
      doc.open(); doc.write(html); doc.close();
      // Aguarda imagem do logo carregar antes de imprimir
      const img = doc.querySelector("img");
      const doPrint = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      };
      if (img) { img.onload = doPrint; img.onerror = doPrint; setTimeout(doPrint, 1500); }
      else { setTimeout(doPrint, 300); }
      onPrint?.();
      return;
    }

    // Desktop/Android: popup tradicional
    const pw = window.open("", "_blank", "width=378,height=189,toolbar=0,scrollbars=0,status=0,menubar=0,resizable=0");
    if (!pw) return;
    pw.document.write(html);
    pw.document.close();
    pw.focus();
    pw.addEventListener("afterprint", () => pw.close());
    setTimeout(() => pw.print(), 500);
    onPrint?.();
  }

  return (
    <div className={wrapperClassName ?? "flex flex-col items-center gap-3"}>
      {/* Preview — proporção 10cm × 5cm (paisagem 2:1) */}
      <div
        className="flex w-full max-w-[400px] flex-row-reverse gap-2 rounded-[10px] bg-white p-2.5 text-slate-950 shadow-sm"
        style={{ fontFamily: "Arial, sans-serif", aspectRatio: "2/1" }}
      >
        {/* Coluna de texto (lado direito, via flex-row-reverse) */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 overflow-hidden">
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="shrink-0 text-[8px] text-slate-500">CODIGO:</span>
            <span className="break-all text-[11px] font-bold leading-tight">{up(codeValue)}</span>
          </div>
          <div className="flex-1 overflow-hidden text-center text-[10px] leading-snug text-slate-800 space-y-px w-full">
            <p className="text-[13px] font-bold leading-tight">{up(label.vehicleLabel)}{label.yearRange ? ` ${up(label.yearRange)}` : ""}</p>
            {(label.feature || label.glassType) && (
              <p className="font-bold">
                {[label.glassType, label.feature, label.manufacturer]
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
            <div className="shrink-0 font-mono text-[8px] text-slate-500 text-center">
              {n1}\00\{up(label.purchaseSummary)}\00\{n2}
            </div>
          )}
          {codeValue && (
            <div ref={bcWrapRef} className="shrink-0 w-full">
              <Barcode value={codeValue} format="CODE128" width={1.1} height={32} fontSize={6} margin={1} />
            </div>
          )}
        </div>
        {/* Coluna logo + QR (lado esquerdo) */}
        <div className="flex w-[90px] shrink-0 flex-col items-center justify-between">
          <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-[30px] w-auto object-contain" />
          {variantTags.length > 0 && (
            <div className="flex justify-center gap-1">
              {variantTags.map((t) => (
                <span key={t} className="rounded-[3px] border border-slate-900 px-1 text-[11px] font-bold leading-tight">{t}</span>
              ))}
            </div>
          )}
          <div ref={qrWrapRef} className="rounded border border-slate-300 p-0.5">
            <QRCodeSVG value={buildLabelQrValue(label)} size={70} level="M" includeMargin={false} />
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
