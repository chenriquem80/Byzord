import { MapPin, Palette, Search } from "lucide-react";
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

const CARAPI_TOKEN = import.meta.env.VITE_CARAPI_TOKEN as string | undefined;
const CARAPI_URL = "https://carapi.app/api/exterior-colors/v2";

type CarapiColor = {
  name: string;
  color_code: string;
  rgb_value?: string;
  generic_color?: { name: string };
};

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

type SearchForm = { make: string; model: string; modelYear: string; plate: string };
type PaintForm = { plate: string; make: string; model: string; modelYear: string; paintCode: string; colorName: string; notes: string };

const EMPTY_SEARCH: SearchForm = { make: "", model: "", modelYear: "", plate: "" };
const EMPTY_PAINT: PaintForm = { plate: "", make: "", model: "", modelYear: "", paintCode: "", colorName: "", notes: "" };

function cleanPlate(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function PaintingPage() {
  const { user: authUser } = useAuth();
  const { readOnly } = usePermissions();

  const [search, setSearch] = useState<SearchForm>(EMPTY_SEARCH);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [saved, setSaved] = useState<VehiclePaint | null>(null);
  const [form, setForm] = useState<PaintForm>(EMPTY_PAINT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const [carapiColors, setCarapiColors] = useState<CarapiColor[]>([]);
  const [carapiLoading, setCarapiLoading] = useState(false);
  const [carapiError, setCarapiError] = useState<string | null>(null);

  const [guideBrand, setGuideBrand] = useState("");

  useEffect(() => {
    const guide = findGuideByMake(form.make);
    if (guide) setGuideBrand(guide.brand);
  }, [form.make]);

  // Busca cores na carapi.app quando make/model/year estão disponíveis
  useEffect(() => {
    if (!searched || !CARAPI_TOKEN || !form.make || !form.model || !form.modelYear) {
      setCarapiColors([]);
      return;
    }
    setCarapiColors([]);
    setCarapiError(null);
    setCarapiLoading(true);
    const params = new URLSearchParams({ year: form.modelYear, make: form.make, model: form.model });
    fetch(`${CARAPI_URL}?${params}`, {
      headers: { Authorization: `Bearer ${CARAPI_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const list: CarapiColor[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setCarapiColors(list);
        if (list.length === 0) setCarapiError("Nenhuma cor encontrada para este veículo na carapi.app.");
      })
      .catch((err) => setCarapiError(`Erro ao buscar cores: ${err.message}`))
      .finally(() => setCarapiLoading(false));
  }, [searched, form.make, form.model, form.modelYear]);

  function setSearchField<K extends keyof SearchForm>(key: K, value: string) {
    setSearch((prev) => ({ ...prev, [key]: value }));
  }

  function setField<K extends keyof PaintForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSearch() {
    setSearchError(null);
    setSaveError(null);
    if (!search.make.trim() || !search.model.trim() || !search.modelYear.trim()) {
      setSearchError("Preencha Marca, Modelo e Ano para buscar.");
      return;
    }
    setSearching(true);
    let found: VehiclePaint | null = null;
    try {
      if (supabase) {
        let query = supabase
          .from("vehicle_paints")
          .select("*")
          .ilike("make", search.make.trim())
          .ilike("model", search.model.trim())
          .eq("model_year", search.modelYear.trim())
          .order("updated_at", { ascending: false })
          .limit(1);
        if (search.plate.length === 7) query = query.eq("plate", search.plate);
        const { data, error } = await query;
        if (error) throw new Error(`banco de dados: ${error.message}`);
        found = (data?.[0] as VehiclePaint) ?? null;
      }
    } catch (err: any) {
      setSearchError(`Erro na consulta: ${err.message ?? err}`);
    }
    setSaved(found);
    setForm({
      plate: found?.plate ?? search.plate,
      make: found?.make ?? search.make.trim(),
      model: found?.model ?? search.model.trim(),
      modelYear: found?.model_year ?? search.modelYear.trim(),
      paintCode: found?.paint_code ?? "",
      colorName: found?.color_name ?? "",
      notes: found?.notes ?? "",
    });
    setSearched(true);
    setSearching(false);
  }

  function handleNew() {
    setSearch(EMPTY_SEARCH);
    setSaved(null);
    setForm(EMPTY_PAINT);
    setSearched(false);
    setSearchError(null);
    setSaveError(null);
    setCarapiColors([]);
    setCarapiError(null);
  }

  async function handleSave() {
    setSaveError(null);
    if (!form.paintCode.trim()) { setSaveError("Informe o código da tinta."); return; }
    if (!form.make.trim() || !form.model.trim() || !form.modelYear.trim()) { setSaveError("Informe marca, modelo e ano."); return; }
    if (!supabase) { setSaveError("Banco de dados não configurado."); return; }

    setSaving(true);
    const payload = {
      plate: form.plate || null,
      vin: null,
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

  return (
    <div className="space-y-6">
      {/* Busca */}
      <SectionCard
        title="Pintura — Código da tinta"
        description="Informe a marca, modelo e ano para buscar as cores disponíveis."
      >
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_140px_180px_auto] md:items-start"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <FormField label="Marca">
            <Input value={search.make} onChange={(e) => setSearchField("make", e.target.value)} placeholder="Ex.: Toyota" />
          </FormField>
          <FormField label="Modelo">
            <Input value={search.model} onChange={(e) => setSearchField("model", e.target.value)} placeholder="Ex.: Corolla" />
          </FormField>
          <FormField label="Ano">
            <Input value={search.modelYear} onChange={(e) => setSearchField("modelYear", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ex.: 2022" />
          </FormField>
          <FormField label="Placa (opcional)">
            <Input value={search.plate} onChange={(e) => setSearchField("plate", cleanPlate(e.target.value))} placeholder="ABC1D23" className="font-mono" />
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

      {/* Cores da carapi.app */}
      {searched && (
        <SectionCard
          title="Cores disponíveis"
          description={`${form.modelYear} ${form.make} ${form.model}`}
        >
          {!CARAPI_TOKEN && (
            <p className="text-sm text-amber-600">Token da carapi.app não configurado. Adicione VITE_CARAPI_TOKEN no ambiente.</p>
          )}
          {carapiLoading && <p className="text-sm text-slate-500">Buscando cores na carapi.app...</p>}
          {carapiError && <p className="text-sm text-danger">{carapiError}</p>}
          {carapiColors.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {carapiColors.map((c, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                      setField("paintCode", c.color_code);
                      setField("colorName", c.name);
                    }}
                  >
                    {c.rgb_value && (
                      <span
                        className="size-6 shrink-0 rounded-full border border-slate-200"
                        style={{ backgroundColor: `#${c.rgb_value}` }}
                      />
                    )}
                    <span>
                      <span className="font-mono font-semibold">{c.color_code}</span>
                      <span className="ml-2 text-slate-600">{c.name}</span>
                      {c.generic_color?.name && <span className="ml-1 text-xs text-slate-400">({c.generic_color.name})</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {carapiColors.length > 0 && (
            <p className="mt-3 text-xs text-slate-400">Clique em uma cor para preencher o código automaticamente.</p>
          )}
        </SectionCard>
      )}

      {/* Registro do código */}
      {searched && (
        <SectionCard
          title={saved ? "Código da tinta cadastrado" : "Registrar código da tinta"}
          description={saved
            ? `Atualizado por ${saved.user_name || "—"} em ${new Date(saved.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
            : "Selecione uma cor acima ou informe o código manualmente."}
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
            <FormField label="Marca">
              <Input value={form.make} onChange={(e) => setField("make", e.target.value)} disabled={readOnly} />
            </FormField>
            <FormField label="Modelo">
              <Input value={form.model} onChange={(e) => setField("model", e.target.value)} disabled={readOnly} />
            </FormField>
            <FormField label="Ano">
              <Input value={form.modelYear} onChange={(e) => setField("modelYear", e.target.value.replace(/\D/g, "").slice(0, 4))} disabled={readOnly} />
            </FormField>
            <FormField label="Placa">
              <Input value={form.plate} onChange={(e) => setField("plate", cleanPlate(e.target.value))} className="font-mono" disabled={readOnly} />
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
            <FormField label="Nome da cor">
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

      {/* Guia de localização da etiqueta */}
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
    </div>
  );
}
