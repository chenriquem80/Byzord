
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

                  <div className="mt-6 rounded-[14px] border-2 border-slate-950 p-4 text-center">
                    <div className="mx-auto grid aspect-square w-full max-w-[150px] place-items-center bg-[linear-gradient(90deg,#000_12%,transparent_12%,transparent_24%,#000_24%,#000_36%,transparent_36%,transparent_48%,#000_48%,#000_60%,transparent_60%,transparent_72%,#000_72%,#000_84%,transparent_84%),linear-gradient(#000_12%,transparent_12%,transparent_24%,#000_24%,#000_36%,transparent_36%,transparent_48%,#000_48%,#000_60%,transparent_60%,transparent_72%,#000_72%,#000_84%,transparent_84%)] bg-[length:26px_26px]" />
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">{label.storeName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

