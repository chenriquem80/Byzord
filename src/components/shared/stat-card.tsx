import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetric } from "@/types/domain";

const toneClassMap = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

export function StatCard({ label, value, helper, breakdown, tone = "default" }: DashboardMetric) {
  const TrendIcon = tone === "success" ? ArrowUpRight : tone === "danger" ? ArrowDownRight : Minus;
  const helperToneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-rose-600"
        : tone === "warning"
          ? "text-amber-600"
          : "text-slate-500";

  return (
    <Card className="overflow-hidden rounded-[30px] border-white/80">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`rounded-2xl p-3 shadow-sm ${toneClassMap[tone]}`}>
              <TrendIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-500">{label}</p>
              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-3xl font-bold leading-none text-slate-950">{value}</p>
                <p className="text-sm text-slate-400">Atualizado agora</p>
              </div>
            </div>
          </div>
          <ArrowUpRight className="mt-1 size-4 shrink-0 text-slate-400" />
        </div>
        <p className={`text-sm font-medium ${helperToneClass}`}>{helper}</p>
        {breakdown?.length ? (
          <div className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {breakdown.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
