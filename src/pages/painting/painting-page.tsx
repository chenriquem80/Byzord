import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useState } from "react";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

// NHTSA vPIC — DecodeVinValues: decodificação do chassi (VIN) em formato plano.
// API pública, gratuita, sem chave e com CORS liberado.
const VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

type VinResult = Record<string, string>;

// Campos exibidos, na ordem, com rótulo em português
const FIELDS: { label: string; value: (r: VinResult) => string }[] = [
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
  { label: "Transmissão", value: (r) => [r.TransmissionStyle, r.TransmissionSpeeds && `${r.TransmissionSpeeds} marchas`].filter(Boolean).join(" · ") },
  { label: "Tração", value: (r) => r.DriveType },
  { label: "Fabricante", value: (r) => r.Manufacturer },
  { label: "Fabricado em", value: (r) => [r.PlantCity, r.PlantState, r.PlantCountry].filter(Boolean).join(", ") },
];

// VIN: 17 caracteres, sem I, O e Q
function cleanVin(value: string): string {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
}

export function PaintingPage() {
  const [vin, setVin] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [result, setResult] = useState<VinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    setResult(null);
    if (vin.length !== 17) { setError("O chassi (VIN) deve ter 17 caracteres."); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ format: "json" });
      if (modelYear) params.set("modelyear", modelYear);
      const res = await fetch(`${VPIC_URL}/${vin}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data.Results?.[0] ?? null);
    } catch (err: any) {
      setError(`Não foi possível consultar a NHTSA: ${err.message ?? err}. Tente novamente em instantes.`);
    } finally {
      setLoading(false);
    }
  }

  const rows = result ? FIELDS.map((f) => ({ label: f.label, value: f.value(result) ?? "" })).filter((f) => f.value.trim()) : [];
  // ErrorCode "0" = decodificação completa; outros códigos indicam dados parciais
  const clean = result?.ErrorCode === "0";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Pintura — Consulta de veículo por chassi"
        description="Decodifica o chassi (VIN) pela base da NHTSA (EUA)."
      >
        <form
          className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <FormField label="Chassi (VIN)" hint={`${vin.length}/17 caracteres`}>
            <Input
              value={vin}
              onChange={(e) => setVin(cleanVin(e.target.value))}
              placeholder="Ex.: 1HGCM82633A004352"
              className="font-mono tracking-wider"
            />
          </FormField>
          <FormField label="Ano do modelo (opcional)" hint="Ajuda a precisar o resultado">
            <Input
              type="number"
              min={1950}
              max={new Date().getFullYear() + 1}
              value={modelYear}
              onChange={(e) => setModelYear(e.target.value)}
            />
          </FormField>
          <Button type="submit" disabled={loading || vin.length !== 17} className="md:mb-6">
            <Search className="size-4" />
            {loading ? "Consultando..." : "Consultar"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          A base da NHTSA é americana: funciona bem para veículos importados dos EUA, mas para a maioria dos veículos
          fabricados no Brasil retorna apenas a marca ou nenhum dado.
        </p>
      </SectionCard>

      {result && (
        <SectionCard title="Dados do veículo" description={`Chassi ${result.VIN || vin}`}>
          <div
            className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${clean ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
          >
            {clean ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
            <div>
              <p className="font-semibold">{clean ? "Chassi decodificado com sucesso." : "Decodificação parcial ou não reconhecida."}</p>
              {!clean && result.ErrorText && <p className="mt-1 text-xs opacity-80">NHTSA: {result.ErrorText}</p>}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">A NHTSA não possui dados para este chassi.</p>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows.map((row) => (
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
