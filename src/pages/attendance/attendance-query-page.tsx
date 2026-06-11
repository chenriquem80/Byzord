import { useState } from "react";
import { Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/database";

type AttendanceRecord = {
  id: string;
  plate: string;
  store_name: string | null;
  service_title: string | null;
  billing_type: string | null;
  executing_employee: string | null;
  observations: string | null;
  status: string;
  created_at: string;
};

function formatPlate(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  let result = "";
  for (let i = 0; i < cleaned.length; i++) {
    result += cleaned[i];
    if (i === 2 && cleaned.length > 3) result += "-";
  }
  return result;
}

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColor: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-slate-100 text-slate-500",
};

export function AttendanceQueryPage() {
  const [plate, setPlate] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!plate.trim()) return;
    setLoading(true);
    setSearched(false);
    if (supabase) {
      const { data } = await supabase
        .from("pending_attendances")
        .select("*")
        .ilike("plate", plate.replace("-", "").trim())
        .order("created_at", { ascending: false });
      setRecords(data ?? []);
    } else {
      setRecords([]);
    }
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Consulta de atendimentos"
        description="Informe a placa do veículo para ver o histórico de atendimentos."
      >
        <div className="flex gap-3">
          <Input
            value={plate}
            onChange={(e) => setPlate(formatPlate(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ABC-1D23"
            className="h-14 max-w-[180px] text-center text-2xl font-semibold tracking-[0.22em]"
          />
          <Button size="lg" onClick={handleSearch} disabled={loading || !plate.trim()}>
            <Search className="size-4" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </SectionCard>

      {searched && (
        <SectionCard
          title={`Resultados para ${plate}`}
          description={
            records.length === 0
              ? "Nenhum atendimento encontrado para esta placa."
              : `${records.length} atendimento${records.length !== 1 ? "s" : ""} encontrado${records.length !== 1 ? "s" : ""}.`
          }
        >
          {records.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Nenhum registro encontrado para a placa <strong>{plate}</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold tracking-wider text-slate-900">{record.plate}</span>
                        <Badge className={statusColor[record.status] ?? "bg-slate-100 text-slate-600"}>
                          {statusLabel[record.status] ?? record.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(record.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        })}
                        {" · "}
                        {new Date(record.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {record.store_name ? ` · ${record.store_name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    {record.service_title && (
                      <p><span className="font-medium">Serviço:</span> {record.service_title}</p>
                    )}
                    {record.billing_type && (
                      <p><span className="font-medium">Cobrança:</span> {record.billing_type}</p>
                    )}
                    {record.executing_employee && (
                      <p><span className="font-medium">Executado por:</span> {record.executing_employee}</p>
                    )}
                    {record.observations && (
                      <p><span className="font-medium">Obs:</span> {record.observations}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
