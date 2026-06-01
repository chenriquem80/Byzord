import { useEffect, useRef, useMemo, useState } from "react";
import { CalendarClock, Camera, Check, Plus, ShieldCheck, X } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { currentUser, attendanceServices } from "@/data/mock-data";
import { supabase } from "@/lib/database";
import type { ServiceOption } from "@/types/domain";

function formatPlate(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  let result = "";
  for (let index = 0; index < cleaned.length; index += 1) {
    result += cleaned[index];
    if (index === 2 && cleaned.length > 3) result += "-";
  }
  return result;
}

export function AttendancePage() {
  const [plate, setPlate] = useState("");
  const [services, setServices] = useState<ServiceOption[]>(attendanceServices);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [billingType, setBillingType] = useState<"Seguro" | "Particular" | "">("");
  const [videoDone, setVideoDone] = useState(false);
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [serviceDescription, setServiceDescription] = useState("");
  const [observations, setObservations] = useState("");
  const [saved, setSaved] = useState(false);

  // Loja do atendimento
  const [dbStores, setDbStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedAttendanceStoreId, setSelectedAttendanceStoreId] = useState("");

  // Novo serviço
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceStoreId, setNewServiceStoreId] = useState("");
  const [addingService, setAddingService] = useState(false);

  // Funcionário executante
  const [executingEmployee, setExecutingEmployee] = useState("");
  const [employees, setEmployees] = useState<string[]>([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  const [showSummary] = useState(false);
  const now = useMemo(() => new Date("2026-05-02T14:30:00"), []);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [{ data: sData }, { data: pData }, { data: stData }] = await Promise.all([
        supabase.from("services").select("id, title, description").eq("active", true).order("created_at"),
        supabase.from("profiles").select("name").order("name"),
        supabase.from("stores").select("id, name").order("name"),
      ]);
      if (sData && sData.length > 0) {
        const mapped = sData.map((s: any) => ({ id: s.id, title: s.title, description: s.description ?? "" }));
        setServices(mapped);
      }
      if (pData) {
        setEmployees(pData.map((p: any) => p.name).filter(Boolean));
      }
      if (stData && stData.length > 0) {
        setDbStores(stData);
        setSelectedAttendanceStoreId(stData[0].id);
      }
    }
    load();
  }, []);

  function handleSave() {
    setSaved(true);
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
        setSelectedServiceId(data.id);
      } else {
        const newSvc: ServiceOption = { id: `svc-${Date.now()}`, title, description };
        setServices((prev) => [...prev, newSvc]);
        setSelectedServiceId(newSvc.id);
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

  const canConfirm = plate && videoDone && selectedServiceId && billingType && executingEmployee.trim() && selectedAttendanceStoreId;

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
              {/* Cabeçalho do usuário */}
              <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <Badge className="w-fit gap-2 bg-white text-primary">
                  <ShieldCheck className="size-4" />
                  {currentUser.name}
                </Badge>
                <Badge className="w-fit gap-2 bg-white text-slate-700">
                  <CalendarClock className="size-4" />
                  {now.toLocaleDateString("pt-BR")} • {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              </div>

              {/* Loja do atendimento */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Loja / Unidade</p>
                <Select
                  value={selectedAttendanceStoreId}
                  onChange={(e) => setSelectedAttendanceStoreId(e.target.value)}
                >
                  {dbStores.length > 0 ? (
                    dbStores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="pinda">Pinda</option>
                      <option value="taubate">Taubaté</option>
                    </>
                  )}
                </Select>
              </div>

              {/* Placa */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Placa do veículo</p>
                <Input
                  value={plate}
                  onChange={(event) => setPlate(formatPlate(event.target.value))}
                  placeholder="ABC-1D23"
                  className="h-14 text-center text-2xl font-semibold tracking-[0.22em]"
                />
                <p className="text-xs text-slate-500">Máscara Mercosul: ABC-1D23</p>
              </div>

              {/* Serviços — estilo lista */}
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

                <Select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                >
                  <option value="">Selecione o serviço...</option>
                  {services.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </Select>
              </div>

              {/* Tipo do atendimento */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Tipo do atendimento</p>
                <Select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as "Seguro" | "Particular")}
                >
                  <option value="">Selecione o tipo...</option>
                  <option value="Seguro">Seguro</option>
                  <option value="Particular">Particular</option>
                </Select>
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

              {/* Descrição do serviço */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Descrição do serviço</p>
                <Textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Descreva o serviço executado..."
                />
              </div>

              {/* Foto do veículo */}
              <div className="rounded-3xl border border-border bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Foto do veículo</p>
                    <p className="mt-1 text-sm text-slate-500">Tire uma foto do veículo antes de prosseguir.</p>
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

              {/* Observações */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Observações</p>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Informações adicionais sobre o atendimento..."
                  className="min-h-24"
                />
              </div>

              {saved ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Atendimento salvo com sucesso. O estoquista verá este item no menu lateral Pedido.
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full md:w-auto"
                  disabled={!canConfirm}
                  onClick={handleSave}
                >
                  Confirmar atendimento
                </Button>
              )}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
