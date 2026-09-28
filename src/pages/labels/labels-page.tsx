
import { useRef, useState } from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, Barcode as BarcodeIcon } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/data/mock-data";
import type { LabelRecord } from "@/types/domain";

type CodeMode = "barcode" | "qrcode";

function LabelContent({ label, mode }: { label: LabelRecord; mode: CodeMode }) {
  const codeValue = label.barcode || label.productCode;

  return (
    <div className="w-full max-w-[280px] rounded-[22px] bg-white p-5 text-slate-950 shadow-sm">
      <p className="text-[13px] font-medium">Codigo:</p>
      <p className="mt-2 break-all text-[30px] font-semibold leading-none tracking-tight">
        {label.productCode}
      </p>

      <div className="mt-7 space-y-1 text-[18px] leading-tight">
        <p>{label.vehicleLabel.toLowerCase()}</p>
        <p>{label.yearRange}</p>
        <p>{label.feature}</p>
        <p>{label.manufacturer}</p>
        <p>{label.purchaseSummary}</p>
      </div>

      <div className="mt-6 flex justify-center rounded-[14px] border-2 border-slate-950 p-3">
        {mode === "qrcode" ? (
          <QRCodeSVG
            value={codeValue}
            size={110}
            level="M"
            includeMargin={false}
          />
        ) : (
          codeValue && (
            <Barcode
              value={codeValue}
              format="CODE128"
              width={1.2}
              height={44}
              fontSize={11}
              margin={0}
            />
          )
        )}
      </div>
    </div>
  );
}

function PrintableLabelCard({ label }: { label: LabelRecord }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CodeMode>("barcode");

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=400,height=650");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta - ${label.productCode}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; display: flex; justify-content: center; padding: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <Card className="border-dashed bg-slate-100">
      <CardContent className="flex flex-col items-center gap-3 p-5">
        {/* Toggle Barcode / QR Code */}
        <div className="flex w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("barcode")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition ${
              mode === "barcode"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <BarcodeIcon className="size-4" />
            Código de Barras
          </button>
          <button
            type="button"
            onClick={() => setMode("qrcode")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition ${
              mode === "qrcode"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <QrCode className="size-4" />
            QR Code
          </button>
        </div>

        <div ref={printRef} className="flex justify-center">
          <LabelContent label={label} mode={mode} />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full max-w-[280px] gap-2"
          onClick={handlePrint}
        >
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
      <SectionCard title="Pré-visualização" description="Formato vertical pronto para impressão rápida na entrada e no balcão.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labels.map((label) => (
            <PrintableLabelCard key={label.id} label={label} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
