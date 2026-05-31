import { useEffect, useRef, useMemo, useState } from "react";
import { CalendarClock, Camera, Check, CheckCircle2, Plus, ShieldCheck, X } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { currentUser, attendanceServices } from "@/data/mock-data";
import { supabase } from "@/lib/database";
import { cn } from "@/lib/utils";
import type { ServiceOption } from "@/types/domain";

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
  const [services, setServices] = useState<ServiceOption[]>(attendanceServices);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [billingType, setBillingType] = useState<"Seguro" | "Particular">("Seguro");
  const [videoDone, setVideoDone] = useState(false);
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Novo serviço
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceStoreId, setNewServiceStoreId] = useState("");
  const [addingService, setAddingService] = useState(false);
  const [dbStores, setDbStores] = useState<{ id: string; name: string }[]>([]);

  // Funcionário executante
  const [executingEmployee, setExecutingEmployee] = useState("");
  const [employees, setEmployees] = useState<string[]>([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  const now = useMemo(() => new Date("2026-05-02T14:30:00"), []);
  const selectedServiceItems = services.filter((item) => selectedServices.includes(item.id));

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [{ data: sData }, { data: pData }, { data: stData }] = await Promise.all([
        supabase.from("services").select("id, title, description").eq("active", true).order("created_at"),
        supabase.from("profiles").select("name").order("name"),
        supabase.from("stores").select("id, name").order("name"),
      ]);
      if (sData && sData.length > 0) {
        setServices(sData.map((s: any) => ({ id: s.id, title: s.title, description: s.description ?? "" })));
      }
      if (pData) {
        setEmployees(pData.map((p: any) => p.name).filter(Boolean));
      }
      if (stData) {
        setDbStores(stData);
      }
    }
    load();
  }, []);

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

  function handleVehiclePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVehiclePhoto(url);
    setVideoDone(true);
    e.target.value = "";
  }

  async function handleAddService() {
    const title = newServiceTitle.trim();
    if (!title) return;
    setAddingService(true);
    try {
      const description = newServiceDescription.trim();
      if (supabase) {
        const { data, error } = await supabase
          .from("services")
          .insert({ title, description, store_id: newServiceStoreId || null })
          .select("id")
          .single();
        if (error) throw error;
        const newSvc: ServiceOption = { id: data.id, title, description };
        setServices((prev) => [...prev, newSvc]);
        setSelectedServices((prev) => [...prev, data.id]);
      } else {
        const newSvc: ServiceOption = { id: `svc-${Date.now()}`, title, description };
        setServices((prev) => [...prev, newSvc]);
        setSelectedServices((prev) => [...prev, newSvc.id]);
      }
      setNewServiceTitle("");
      setNewServiceDescription("");
      setNewServiceStoreId("");
      setShowAddService(false);
    } catch (err) {
      console.error("Erro ao adicionar serviço:", err);
    } finally {
      setAddingService(false);
    }
  }

  const canConfirm = plate && videoDone && selectedServiceItems.length > 0 && executingEmployee.trim();

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

              {/* Serviços */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Serviço a executar</p>
                  {!showAddService && (
                    <button
                      type="button"
                      onClick={() => { setShowAddService(true); setNewServiceTitle(""); setNewServiceDescription(""); }}
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-primary hover:text-primary"
                    >
                      <Plus className="size-3.5" />
                      Novo serviço
                    </button>
                  )}
                </div>

                {showAddService && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">Novo serviço</p>
                    <Input
                      value={newServiceTitle}
                      onChange={(e) => setNewServiceTitle(e.target.value)}
                      placeholder="Nome do serviço"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddService(); } if (e.key === "Escape") setShowAddService(false); }}
                    />
                    <Input
                      value={newServiceDescription}
                      onChange={(e) => setNewServiceDescription(e.target.value)}
                      placeholder="Descrição (opcional)"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddService(); } if (e.key === "Escape") setShowAddService(false); }}
                    />
                    <Select
                      value={newServiceStoreId}
                      onChange={(e) => setNewServiceStoreId(e.target.value)}
                    >
                      <option value="">Todas as lojas</option>
                      {dbStores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </Select>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddService} disabled={addingService || !newServiceTitle.trim()}>
                        <Check className="size-3.5" />
                        {addingService ? "Salvando..." : "Salvar"}
                      </Button>
                      <button type="button" onClick={() => setShowAddService(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {services.map((item) => (
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

              {/* Tipo do atendimento */}
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

              {/* Funcionário executante */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Funcionário executante</p>
                <div className="relative">
                  <Input
                    value={executingEmployee}
                    onChange={(e) => { setExecutingEmployee(e.target.value); setEmployeeDropdownOpen(true); }}
                    onFocus={() => setEmployeeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setEmployeeDropdownOpen(false), 150)}
                    placeholder="Nome do funcionário..."
                  />
                  {employeeDropdownOpen && employees.filter((emp) => !executingEmployee || emp.toLowerCase().includes(executingEmployee.toLowerCase())).length > 0 && (
                    <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
                      {employees
                        .filter((emp) => !executingEmployee || emp.toLowerCase().includes(executingEmployee.toLowerCase()))
                        .map((emp) => (
                          <li
                            key={emp}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50"
                            onMouseDown={() => { setExecutingEmployee(emp); setEmployeeDropdownOpen(false); }}
                          >
                            {emp}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-slate-500">Selecione da lista ou digite o nome do responsável.</p>
              </div>

              {/* Foto do veículo */}
              <div className="rounded-3xl border border-border bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Foto do veículo</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Tire uma foto do veículo antes de prosseguir.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleVehiclePhoto}
                    />
                    <Button
                      size="lg"
                      variant={videoDone ? "success" : "outline"}
                      onClick={() => photoRef.current?.click()}
                    >
                      <Camera className="size-4" />
                      {videoDone ? "Foto adicionada" : "Adicionar foto do veículo"}
                    </Button>
                    {vehiclePhoto && (
                      <img
                        src={vehiclePhoto}
                        alt="Foto do veículo"
                        className="h-24 w-36 rounded-2xl border border-border object-cover shadow-sm"
                      />
                    )}
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full md:w-auto"
                disabled={!canConfirm}
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
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Executante</p>
                <p className="mt-2 font-semibold text-slate-900">{executingEmployee || "—"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Foto do veículo</p>
                <div className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className={cn("size-5", videoDone ? "text-emerald-600" : "text-slate-300")} />
                  {videoDone ? "OK, foto adicionada" : "Pendente"}
                </div>
                {vehiclePhoto && (
                  <img src={vehiclePhoto} alt="Foto do veículo" className="mt-3 h-20 w-28 rounded-xl border border-border object-cover" />
                )}
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <Button size="lg" variant="outline" onClick={() => setShowSummary(false)}>
                  Voltar e editar
                </Button>
                <Button
                  size="lg"
                  className="md:flex-1"
                  disabled={!canConfirm}
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


