import { Paintbrush } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";

export function PaintingPage() {
  return (
    <SectionCard title="Pintura" description="Funções de pintura.">
      <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-500">
        <Paintbrush className="size-10 text-slate-300" />
        <p className="text-sm">Esta tela está em construção.</p>
      </div>
    </SectionCard>
  );
}
