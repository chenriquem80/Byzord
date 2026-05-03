import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { attendanceQueue } from "@/data/mock-data";

export function OrdersPage() {
  return (
    <div className="space-y-6">
            <SectionCard
        title="Pendentes para estoque"
        description="Fila que o estoquista usará para retirar os produtos após o atendimento ser aberto."
      >
        <div className="space-y-3">
          {attendanceQueue.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.plate}</p>
                    <p className="text-sm text-slate-500">
                      {item.employeeName} • {item.storeName}
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">{item.status}</Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {item.serviceType} • {item.billingType}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {attendanceQueue.length} atendimentos aguardando separação.
        </p>
      </SectionCard>
    </div>
  );
}

