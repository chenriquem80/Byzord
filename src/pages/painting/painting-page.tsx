import { AlertTriangle, CheckCircle2, MapPin, Palette, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { ReadOnlyNotice } from "@/components/shared/read-only-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/lib/database";
import { PAINT_LABEL_GUIDES, findGuideByMake } from "./paint-label-guide";

// NHTSA vPIC — DecodeVinValues: decodificação do chassi (VIN) em formato plano.
// API pública, gratuita, sem chave e com CORS liberado. Não informa cor/código de tinta.
const VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

type VinResult = Record<string, string>;

type VehiclePaint = {
  id: string;
  plate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  model_year: string | null;
  paint_code: string;
  color_name: string | null;
  notes: string | null;
  user_name: string | null;
  updated_at: string;
};

type PaintForm = {
  plate: string;
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  paintCode: string;
  colorName: string;
  notes: string;
};

const EMPTY_FORM: PaintForm = { plate: "", vin: "", make: "", model: "", modelYear: "", paintCode: "", colorName: "", notes: "" };

// Campos do chassi exibidos, na ordem, com rótulo em português
const VIN_FIELDS: { label: string; value: (r: VinResult) => string }[] = [
  { label: "Marca", value: (r) => r.Make },
  { label: "Modelo", value: (r) => r.Model },
  { label: "Ano do modelo", value: (r) => r.ModelYear },
  { label: "Versão", value: (r) => [r.Trim, r.Series].filter(Boolean).join(" / ") },
  { label: "Carroceria", value: (r) => r.BodyClass },
  { label: "Tipo de veículo", value: (r) => r.VehicleType },
  { label: "Portas", value: (r) => r.Doors },
  {
    label: "Motor",
    value: (r) => [
      r.DisplacementL ? `${Number(r.DisplacementL).toFixed(1)} L` : "",
      r.EngineCylinders ? `${r.EngineCylinders} cilindros` : "",
      r.EngineHP ? `${r.EngineHP} hp` : "",
    ].filter(Boolean).join(" · "),
  },
  { label: "Combustível", value: (r) => r.FuelTypePrimary },
  { label: "Fabricante", value: (r) => r.Manufacturer },
  { label: "Fabricado em", value: (r) => [r.PlantCity, r.PlantState, r.PlantCountry].filter(Boolean).join(", ") },
];

// VIN: 17 caracteres, sem I, O e Q
function cleanVin(value: string): string {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
}

// Placa: 7 caracteres, sem traço (ABC1234 ou Mercosul ABC1D23)
function cleanPlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function capitalize(value: string): string {
  return value.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function PaintingPage() {
  const { user: authUser } = useAuth();
  const { readOnly } = usePermissions();

  const [searchPlate, setSearchPlate] = useState("");
  const [searchVin, setSearchVin] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [saved, setSaved] = useState<VehiclePaint | null>(null);
  const [vinResult, setVinResult] = useState<VinResult | null>(null);

  const [form, setForm] = useState<PaintForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const [guideBrand, setGuideBrand] = useState("");

  // Guia acompanha a marca informada/decodificada
  useEffect(() => {
    const guide = findGuideByMake(form.make);
    if (guide) setGuideBrand(guide.brand);
  }, [form.make]);

  function setField<K extends keyof PaintForm>(key: K, value: PaintForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function decodeVin(vin: string): Promise<VinResult | null> {
    const res = await fetch(`${VPIC_URL}/${vin}?format=json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.Results?.[0] ?? null;
  }

  async function handleSearch() {
    setSearchError(null);
    setSaveError(null);
    const plate = searchPlate;
    const vin = searchVin;
    if (plate.length !== 7 && vin.length !== 17) {
      setSearchError("Informe a placa (7 caracteres) ou o chassi (17 caracteres).");
      return;
    }
    setSearching(true);
    let found: VehiclePaint | null = null;
    let decoded: VinResult | null = null;
    try {
      if (supabase) {
        const filters = [plate.length === 7 && `plate.eq.${plate}`, vin.length === 17 && `vin.eq.${vin}`].filter(Boolean).join(",");
        const { data, error } = await supabase
          .from("vehicle_paints")
          .select("*")
          .or(filters)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (error) throw new Error(`banco de dados: ${error.message}`);
        found = (data?.[0] as VehiclePaint) ?? null;
      }
      const vinToDecode = vin.length === 17 ? vin : found?.vin ?? "";
      if (vinToDecode.length === 17) {
        try { decoded = await decodeVin(vinToDecode); } catch { decoded = null; }
      }
    } catch (err: any) {
      setSearchError(`Erro na consulta: ${err.message ?? err}`);
    }

    setSaved(found);
    setVinResult(decoded);
    setForm({
      plate: found?.plate ?? plate,
      vin: found?.vin ?? vin,
      make: found?.make ?? (decoded?.Make ? capitalize(decoded.Make) : ""),
      model: found?.model ?? decoded?.Model ?? "",
      modelYear: found?.model_year ?? decoded?.ModelYear ?? "",
      paintCode: found?.paint_code ?? "",
      colorName: found?.color_name ?? "",
      notes: found?.notes ?? "",
    });
    setSearched(true);
    setSearching(false);
  }

  function handleNew() {
    setSearchPlate("");
    setSearchVin("");
    setSaved(null);
    setVinResult(null);
    setForm(EMPTY_FORM);
    setSearched(false);
    setSearchError(null);
    setSaveError(null);
  }

  async function handleSave() {
    setSaveError(null);
    if (!form.paintCode.trim()) { setSaveError("Informe o código da tinta."); return; }
    if (form.plate.length !== 7 && form.vin.length !== 17) { setSaveError("Informe a placa ou o chassi do veículo."); return; }
    if (!supabase) { setSaveError("Banco de dados não configurado."); return; }

    setSaving(true);
    const payload = {
      plate: form.plate || null,
      vin: form.vin || null,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      model_year: form.modelYear.trim() || null,
      paint_code: form.paintCode.trim().toUpperCase(),
      color_name: form.colorName.trim() || null,
      notes: form.notes.trim() || null,
      user_name: authUser?.name ?? "",
      updated_at: new Date().toISOString(),
    };
    const { data, error } = saved
      ? await supabase.from("vehicle_paints").update(payload).eq("id", saved.id).select("*").single()
      : await supabase.from("vehicle_paints").insert(payload).select("*").single();
    setSaving(false);
    if (error) { setSaveError(`Erro ao salvar: ${error.message}`); return; }
    setSaved(data as VehiclePaint);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  }

  const guide = PAINT_LABEL_GUIDES.find((g) => g.brand === guideBrand);
  const vinRows = vinResult ? VIN_FIELDS.map((f) => ({ label: f.label, value: f.value(vinResult) ?? "" })).filter((f) => f.value.trim()) : [];
  const vinClean = vinResult?.ErrorCode === "0";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Pintura — Código da tinta"
        description="Busque o veículo pela placa ou chassi para ver ou registrar o código da tinta."
      >
        <form
          className="grid gap-4 md:grid-cols-[200px_1fr_auto] md:items-start"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <FormField label="Placa">
            <Input
              value={searchPlate}
              onChange={(e) => setSearchPlate(cleanPlate(e.target.value))}
              placeholder="ABC1D23"
              className="font-mono tracking-wider"
            />
          </FormField>
          <FormField label="Chassi (VIN)" hint={`${searchVin.length}/17 caracteres`}>
            <Input
              value={searchVin}
              onChange={(e) => setSearchVin(cleanVin(e.target.value))}
              placeholder="Ex.: 9BWAH5BZ8ST646030"
              className="font-mono tracking-wider"
            />
          </FormField>
          <div className="flex gap-2 md:mt-7">
            <Button type="submit" disabled={searching}>
              <Search className="size-4" />
              {searching ? "Buscando..." : "Buscar"}
            </Button>
            {searched && <Button type="button" variant="outline" onClick={handleNew}>Limpar</Button>}
          </div>
        </form>
        {searchError && <p className="mt-2 text-sm text-danger">{searchError}</p>}
      </SectionCard>

      {searched && (
        <SectionCard
          title={saved ? "Código da tinta cadastrado" : "Registrar código da tinta"}
          description={saved
            ? `Atualizado por ${saved.user_name || "—"} em ${new Date(saved.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
            : "Nenhum código registrado para este veículo. Leia a etiqueta do carro e registre abaixo."}
          action={savedMessage ? <span className="text-sm font-medium text-emerald-600">Salvo com sucesso!</span> : null}
        >
          {saved && (
            <div className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <Palette className="size-8 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Código da tinta</p>
                <p className="font-mono text-3xl font-bold tracking-wider text-emerald-900">{saved.paint_code}</p>
                {saved.color_name && <p className="text-sm text-emerald-800">{saved.color_name}</p>}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Placa">
              <Input value={form.plate} onChange={(e) => setField("plate", cleanPlate(e.target.value))} className="font-mono" disabled={readOnly} />
            </FormField>
            <FormField label="Chassi (VIN)" className="md:col-span-2">
              <Input value={form.vin} onChange={(e) => setField("vin", cleanVin(e.target.value))} className="font-mono" disabled={readOnly} />
            </FormField>
            <FormField label="Marca">
              <Input value={form.make} onChange={(e) => setField("make", e.target.value)} disabled={readOnly} />
            </FormField>
            <FormField label="Modelo">
              <Input value={form.model} onChange={(e) => setField("model", e.target.value)} disabled={readOnly} />
            </FormField>
            <FormField label="Ano">
              <Input value={form.modelYear} onChange={(e) => setField("modelYear", e.target.value.replace(/\D/g, "").slice(0, 4))} disabled={readOnly} />
            </FormField>
            <FormField label="Código da tinta *">
              <Input
                value={form.paintCode}
                onChange={(e) => setField("paintCode", e.target.value.toUpperCase())}
                placeholder="Ex.: LB9A"
                className="font-mono text-base font-semibold tracking-wider"
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Nome da cor" className="md:col-span-2">
              <Input value={form.colorName} onChange={(e) => setField("colorName", e.target.value)} placeholder="Ex.: Branco Cristal" disabled={readOnly} />
            </FormField>
            <FormField label="Observações" className="md:col-span-3">
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="min-h-20" disabled={readOnly} />
            </FormField>
          </div>

          {saveError && <p className="mt-3 text-sm text-danger">{saveError}</p>}
          <div className="mt-4">
            {readOnly ? (
              <ReadOnlyNotice />
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : saved ? "Salvar alterações" : "Salvar código"}
              </Button>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Onde encontrar o código da tinta"
        description="A etiqueta fica no próprio veículo. Os locais podem variar conforme modelo e ano."
      >
        <FormField label="Marca" className="md:max-w-xs">
          <Select value={guideBrand} onChange={(e) => setGuideBrand(e.target.value)} placeholder="Selecione a marca">
            {PAINT_LABEL_GUIDES.map((g) => <option key={g.brand} value={g.brand}>{g.brand}</option>)}
          </Select>
        </FormField>
        {guide ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-slate-50 p-4">
            <ul className="space-y-2">
              {guide.locations.map((loc) => (
                <li key={loc} className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  {loc}
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Formato do código:</span> {guide.codeFormat}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Selecione a marca para ver onde fica a etiqueta.</p>
        )}
      </SectionCard>

      {vinResult && (
        <SectionCard title="Dados do chassi (NHTSA)" description="Base americana — para veículos nacionais costuma trazer só a marca e o ano.">
          <div className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${vinClean ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            {vinClean ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
            <div>
              <p className="font-semibold">{vinClean ? "Chassi decodificado com sucesso." : "Decodificação parcial ou não reconhecida."}</p>
              {!vinClean && vinResult.ErrorText && <p className="mt-1 text-xs opacity-80">NHTSA: {vinResult.ErrorText}</p>}
            </div>
          </div>
          {vinRows.length === 0 ? (
            <p className="text-sm text-slate-500">A NHTSA não possui dados para este chassi.</p>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {vinRows.map((row) => (
                <div key={row.label} className="border-b border-slate-100 pb-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{row.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </SectionCard>
      )}
    </div>
  );
}
