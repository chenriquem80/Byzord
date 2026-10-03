
import { SectionCard } from "@/components/shared/section-card";
import { Card, CardContent } from "@/components/ui/card";
import { LabelCard } from "@/components/shared/label-card";
import { labels } from "@/data/mock-data";
import type { LabelRecord } from "@/types/domain";

function PrintableLabelCard({ label }: { label: LabelRecord }) {
  const codeValue = label.barcode || label.productCode;
  return (
    <Card className="border-dashed bg-slate-100">
      <CardContent className="flex flex-col items-center gap-3 p-5">
        <LabelCard
          label={{
            productCode: codeValue,
            vehicleLabel: label.vehicleLabel,
            yearRange: label.yearRange,
            feature: label.feature,
            lado: label.lado,
            glassType: label.glassType,
            manufacturer: label.manufacturer,
            purchaseSummary: label.purchaseSummary,
          }}
        />
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
