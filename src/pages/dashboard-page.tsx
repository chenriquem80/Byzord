import { BellRing } from "lucide-react";
import { useMemo, useState } from "react";

import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { attendanceQueue, dashboardMetrics, purchaseOrders, stockMovements, stores } from "@/data/mock-data";

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState("2026-05-02");

  const filteredMovements = useMemo(() => {
    if (!selectedDate) {
      return stockMovements;
    }

    return stockMovements.filter((item) => item.date.startsWith(selectedDate));
  }, [selectedDate]);

  const filteredPendingAttendances = useMemo(() => {
    if (!selectedDate) {
      return attendanceQueue;
    }

    return attendanceQueue.filter((item) => item.openedAt.startsWith(selectedDate));
  }, [selectedDate]);

  return (
    <div className="space-y-6">


      <SectionCard
        title="Resumo por loja"
        description="Visual rápido para comparar o saldo operacional entre as unidades."
        action={
          <div className="w-full md:w-52">
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map((store) => {
            const movementsCount = filteredMovements.filter((item) => item.storeId === store.id).length;
            const pendingCount = filteredPendingAttendances.filter((item) => item.storeName === store.name).length;

            return (
              <div key={store.id} className="rounded-2xl border border-border bg-white p-5">
                <p className="text-lg font-semibold text-slate-900">{store.name}</p>
                <p className="mt-1 text-sm text-slate-500">{store.city}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Movimentações</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{movementsCount}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pendências</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{pendingCount}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          title="Movimentações recentes"
          description="Últimos registros de entrada, saída e ajustes com responsável."
        >
          <div className="space-y-3">
            {stockMovements.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.type} • {item.productName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.storeName} • {item.manufacturer} • {item.user} • {new Date(item.date).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold text-slate-900">{item.quantity} un.</p>
                  <p className="text-sm text-slate-500">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Pendências do dia"
          description="Alertas para manter o estoque abastecido e o atendimento fluindo."
        >
          <div className="space-y-3">
            {purchaseOrders.map((item) => (
              <div key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-sm text-slate-600">
                      {item.storeName} • {item.suggestedQuantity} un. com {item.suggestedSupplier}
                    </p>
                  </div>
                  <Badge className="bg-rose-100 text-rose-700">
                    <BellRing className="mr-1 size-3.5" />
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.note}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Atendimentos pendentes para estoque"
        description="Fila que o estoquista deve consultar para separar os produtos do próximo passo."
      >
        <div className="space-y-3">
          {attendanceQueue.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {item.plate} • {item.serviceType}
                </p>
                <p className="text-sm text-slate-500">
                  {item.employeeName} • {item.storeName} • {item.billingType}
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-700">{item.status}</Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}

