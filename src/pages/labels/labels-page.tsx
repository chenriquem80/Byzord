
import { useRef } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/data/mock-data";
import type { LabelRecord } from "@/types/domain";

const LOGO_URL = `${window.location.origin}/logo.png`;

const PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 10cm 15cm; margin: 0; }
  html, body { width: 10cm; height: 15cm; background: #fff; font-family: sans-serif; color: #0f172a; overflow: hidden; }
  body { padding: 0.5cm; display: flex; flex-direction: column; gap: 0; }
  .code-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 0.25cm; }
  .code-label { font-size: 8pt; color: #64748b; white-space: nowrap; }
  .code-value { font-size: 11pt; font-weight: 700; word-break: break-all; line-height: 1.2; }
  .logo-wrap { display: flex; justify-content: center; margin-bottom: 0.25cm; }
  .logo-wrap img { height: 1.1cm; width: auto; display: block; }
  .info { font-size: 9.5pt; line-height: 1.5; margin-bottom: 0.3cm; }
  .info p { margin: 0; }
  .qr-box { display: flex; justify-content: center; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.2cm; margin-bottom: 0.2cm; }
  .bc-box { display: flex; justify-content: center; }
  svg { max-width: 100%; height: auto; }
`;


function PrintableLabelCard({ label }: { label: LabelRecord }) {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const bcWrapRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const qrSvg  = qrWrapRef.current?.querySelector("svg")?.outerHTML ?? "";
    const bcSvg  = bcWrapRef.current?.querySelector("svg")?.outerHTML ?? "";
    const codeValue = label.barcode || label.productCode;

    const printWindow = window.open("", "_blank", "width=420,height=600");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta - ${label.productCode}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="code-row">
    <span class="code-label">Codigo:</span>
    <span class="code-value">${label.productCode}</span>
  </div>
  <div class="logo-wrap">
    <img src="${LOGO_URL}" alt="Byzord Auto Vitrais" />
  </div>
  <div class="info">
    <p>${label.vehicleLabel.toLowerCase()}</p>
    ${label.yearRange ? `<p>${label.yearRange}</p>` : ""}
    ${label.feature   ? `<p>${label.feature}</p>`   : ""}
    ${label.manufacturer   ? `<p>${label.manufacturer}</p>`   : ""}
    ${label.purchaseSummary ? `<p>${label.purchaseSummary}</p>` : ""}
  </div>
  ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ""}
  ${(codeValue && bcSvg) ? `<div class="bc-box">${bcSvg}</div>` : ""}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  const codeValue = label.barcode || label.productCode;

  return (
    <Card className="border-dashed bg-slate-100">
      <CardContent className="flex flex-col items-center gap-3 p-5">
        {/* Preview */}
        <div className="w-full max-w-[260px] rounded-[18px] bg-white px-4 pb-4 pt-3 text-slate-950 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-[11px] font-medium text-slate-500">Codigo:</span>
            <span className="break-all text-[15px] font-bold leading-tight tracking-tight">{label.productCode}</span>
          </div>
          <div className="mt-2 flex justify-center">
            <img src={LOGO_URL} alt="Byzord Auto Vitrais" className="h-12 w-auto object-contain" />
          </div>
          <div className="mt-3 space-y-0.5 text-[13px] leading-snug text-slate-800">
            <p>{label.vehicleLabel.toLowerCase()}</p>
            <p>{label.yearRange}</p>
            <p>{label.feature}</p>
            <p>{label.manufacturer}</p>
            <p>{label.purchaseSummary}</p>
          </div>
          {/* QR — ref para capturar SVG no print */}
          <div ref={qrWrapRef} className="mt-4 flex justify-center rounded-[12px] border border-slate-300 p-2">
            <QRCodeSVG value={codeValue} size={120} level="M" includeMargin={false} />
          </div>
          {/* Barcode — ref para capturar SVG no print */}
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
      </CardContent>
    </Card>
  );
}

export function LabelsPage() {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Pré-visualização"
        description="Formato 10×15 cm — pronto para impressão na entrada e no balcão."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labels.map((label) => (
            <PrintableLabelCard key={label.id} label={label} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
