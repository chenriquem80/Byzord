
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

function LabelContent({ label }: { label: LabelRecord }) {
  const codeValue = label.barcode || label.productCode;

  return (
    <div className="w-full max-w-[260px] rounded-[18px] bg-white px-4 pb-4 pt-3 text-slate-950 shadow-sm">
      {/* Linha de código — compacta */}
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 text-[11px] font-medium text-slate-500">Codigo:</span>
        <span className="break-all text-[15px] font-bold leading-tight tracking-tight">
          {label.productCode}
        </span>
      </div>

      {/* Logo da loja */}
      <div className="mt-2 flex justify-center">
        <img
          src={LOGO_URL}
          alt="Byzord Auto Vitrais"
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Informações do produto */}
      <div className="mt-3 space-y-0.5 text-[13px] leading-snug text-slate-800">
        <p>{label.vehicleLabel.toLowerCase()}</p>
        <p>{label.yearRange}</p>
        <p>{label.feature}</p>
        <p>{label.manufacturer}</p>
        <p>{label.purchaseSummary}</p>
      </div>

      {/* QR Code */}
      <div className="mt-4 flex justify-center rounded-[12px] border border-slate-300 p-2">
        <QRCodeSVG
          value={codeValue}
          size={120}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Código de Barras */}
      {codeValue && (
        <div className="mt-2 flex justify-center">
          <Barcode
            value={codeValue}
            format="CODE128"
            width={1.1}
            height={36}
            fontSize={10}
            margin={0}
          />
        </div>
      )}
    </div>
  );
}

function PrintableLabelCard({ label }: { label: LabelRecord }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=380,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta - ${label.productCode}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; display: flex; justify-content: center; padding: 16px; background: #fff; }
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
        <div ref={printRef} className="flex justify-center">
          <LabelContent label={label} />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full max-w-[260px] gap-2"
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
      <SectionCard
        title="Pré-visualização"
        description="Formato vertical pronto para impressão rápida na entrada e no balcão."
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
