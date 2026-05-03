import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ShieldCheck, Video } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUser, attendanceServices } from "@/data/mock-data";
import { cn } from "@/lib/utils";

function formatPlate(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  let result = "";

  for (let index = 0; index < cleaned.length; index += 1) {
    result += cleaned[index];
    if (index === 2 && cleaned.length > 3) {
      result += "-";
    }
  }

  return result;
}

export function AttendancePage() {
  const [plate, setPlate] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>(["parabrisa"]);
  const [billingType, setBillingType] = useState<"Seguro" | "Particular">("Seguro");
  const [videoDone, setVideoDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const now = useMemo(() => new Date("2026-05-02T14:30:00"), []);
  const selectedServiceItems = attendanceServices.filter((item) => selectedServices.includes(item.id));

  function handleSave() {
    setSaved(true);
  }

  function toggleService(serviceId: string) {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
  }

  return (
    <div className="space-y-6">
            <div className="grid gap-6">
        <SectionCard
          title={showSummary ? "Dados confirmados" : "Atendimento em andamento"}
          description={
            showSummary
              ? "Os dados abaixo foram confirmados e estão prontos para virar atendimento pendente."
              : "Preencha os dados principais antes de liberar para o estoquista."
          }
        >
          {!showSummary ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <Badge className="w-fit gap-2 bg-white text-primary">
                  <ShieldCheck className="size-4" />
                  {currentUser.name} • {currentUser.storeName}
                </Badge>
                <Badge className="w-fit gap-2 bg-white text-slate-700">
                  <CalendarClock className="size-4" />
                  {now.toLocaleDateString("pt-BR")} • {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Placa do veículo</p>
                <Input
                  value={plate}
                  onChange={(event) => setPlate(formatPlate(event.target.value))}
                  placeholder="ABC-1D23"
                  className="h-14 text-center text-2xl font-semibold tracking-[0.22em]"
                />
                <p className="text-xs text-slate-500">
                  Máscara Mercosul: `ABC-1D23`
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Serviço a executar</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {attendanceServices.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleService(item.id)}
                      className={cn(
                        "rounded-3xl border p-5 text-left transition",
                        selectedServices.includes(item.id)
                          ? "border-primary bg-primary text-white shadow-lg"
                          : "border-border bg-white hover:border-primary/40 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-lg font-semibold">{item.title}</p>
                      <p className={cn("mt-2 text-sm", selectedServices.includes(item.id) ? "text-blue-50" : "text-slate-500")}>
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Tipo do atendimento</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {(["Seguro", "Particular"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setBillingType(item)}
                      className={cn(
                        "rounded-3xl border p-5 text-left transition",
                        billingType === item
                          ? "border-primary bg-primary text-white shadow-lg"
                          : "border-border bg-white hover:border-primary/40 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-lg font-semibold">{item}</p>
                      <p className={cn("mt-2 text-sm", billingType === item ? "text-blue-50" : "text-slate-500")}>
                        {item === "Seguro"
                          ? "Atendimento ligado a seguradora."
                          : "Atendimento direto do cliente no balcão."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Vídeo obrigatório</p>
                    <p className="mt-1 text-sm text-slate-500">
                      O sistema precisa confirmar que o vídeo do veículo foi feito antes de seguir.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    variant={videoDone ? "success" : "outline"}
                    onClick={() => setVideoDone((value) => !value)}
                  >
                    <Video className="size-4" />
                    {videoDone ? "Vídeo confirmado" : "Marcar vídeo feito"}
                  </Button>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full md:w-auto"
                disabled={!plate || !videoDone || selectedServiceItems.length === 0}
                onClick={() => setShowSummary(true)}
              >
                Confirmar atendimento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Funcionário</p>
                <p className="mt-2 font-semibold text-slate-900">{currentUser.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Loja</p>
                <p className="mt-2 font-semibold text-slate-900">{currentUser.storeName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Placa</p>
                <p className="mt-2 font-semibold text-slate-900">{plate || "Não preenchida"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Serviço</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {selectedServiceItems.length
                    ? selectedServiceItems.map((item) => item.title).join(" • ")
                    : "Nenhum serviço selecionado"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Cobrança</p>
                <p className="mt-2 font-semibold text-slate-900">{billingType}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Vídeo</p>
                <div className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className={cn("size-5", videoDone ? "text-emerald-600" : "text-slate-300")} />
                  {videoDone ? "OK, vídeo feito" : "Pendente"}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <Button size="lg" variant="outline" onClick={() => setShowSummary(false)}>
                  Voltar e editar
                </Button>
                <Button
                  size="lg"
                  className="md:flex-1"
                  disabled={!plate || !videoDone || selectedServiceItems.length === 0}
                  onClick={handleSave}
                >
                  Salvar atendimento pendente
                </Button>
              </div>
              {saved ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                  Atendimento salvo como pendente. O estoquista verá este item no menu lateral Pedido.
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}


