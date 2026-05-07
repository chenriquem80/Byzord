
import Barcode from "react-barcode";

import { SectionCard } from "@/components/shared/section-card";

import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/data/mock-data";

export function LabelsPage() {
  return (
    <div className="space-y-6">


      <SectionCard title="Pré-visualização" description="Formato vertical pronto para impressão rápida na entrada e no balcão.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {labels.map((label) => (
            <Card key={label.id} className="border-dashed bg-slate-100">
              <CardContent className="flex justify-center p-5">
                <div className="w-full max-w-[280px] rounded-[22px] bg-white p-5 text-slate-950 shadow-sm">
                  <p className="text-[13px] font-medium">Codigo:</p>
                  <p className="mt-2 break-all text-[30px] font-semibold leading-none tracking-tight">
                    {label.productCode}
                  </p>

                  <div className="mt-7 space-y-3">
                    <div>
                      <p className="text-[13px] font-medium">Estocagem:</p>
                      <p className="mt-1 text-[28px] font-semibold leading-none">{label.location}</p>
                    </div>

                    <div className="space-y-1 text-[18px] leading-tight">
                      <p>{label.vehicleLabel.toLowerCase()}</p>
                      <p>{label.yearRange}</p>
                      <p>{label.feature}</p>
                      <p>{label.manufacturer}</p>
                      <p>{label.purchaseSummary}</p>
                    </div>
                  </div>

                  {label.barcode && (
                    <div className="mt-6 flex justify-center rounded-[14px] border-2 border-slate-950 p-3">
                      <Barcode
                        value={label.barcode}
                        format="EAN13"
                        width={1.5}
                        height={60}
                        fontSize={12}
                        margin={0}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

