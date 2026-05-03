import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getIcon } from "@/components/shared/icon-map";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ModuleSummary } from "@/types/domain";

export function ModuleCard({ title, description, route, icon, alertCount }: ModuleSummary) {
  const Icon = getIcon(icon);

  return (
    <Link to={route} className="group">
      <Card className="h-full min-h-36 overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-2xl">
        <div className="flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Icon className="size-7" />
            </div>
            {alertCount ? (
              <Badge className="gap-1 bg-rose-100 text-rose-700">
                <AlertCircle className="size-3.5" />
                {alertCount}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
