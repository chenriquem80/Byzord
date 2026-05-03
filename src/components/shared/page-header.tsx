import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-hidden rounded-[28px] bg-hero-grid p-5 shadow-panel md:flex-row md:items-center md:justify-between md:p-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-3">
        {badge ? (
          <Badge className="bg-primary/10 text-primary">{badge}</Badge>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold md:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm text-slate-600 md:text-base">{description}</p>
        </div>
      </div>
      {action ?? (
        <Button size="lg" variant="secondary" className="w-full md:w-auto">
          Fluxo rápido
        </Button>
      )}
    </div>
  );
}
