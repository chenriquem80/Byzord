import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { products, stores, suppliers } from "@/data/mock-data";
import { formatCurrency, formatMonthYear, formatPercentage } from "@/lib/format";
import { Check, Plus, X } from "lucide-react";
import { supabase } from "@/lib/database";
import { productSchema } from "@/lib/schemas";
import type { Product } from "@/types/domain";

type ProductFormValues = {
  internalCode: string;
  supplierCode: string;
  barcode: string;
  name: string;
  isTypeB: boolean;
  isTypeR: boolean;
  glassType: string;
  feature: string;
  manufacturer: string;
  brand: string;
  description: string;
  location: string;
  quantity: number;
  minimum: number;
  cost: number;
  price: number;
  lastPurchaseDate: string;
  lastSupplier: string;
  status: "ativo" | "inativo";
  notes?: string;
};

function generateUniqueBarcode(): string {
  const existing = new Set(products.map((p) => p.barcode));
  let code: string;
  do {
    code = "789" + String(Math.floor(Math.random() * 10_000_000_000)).padStart(10, "0");
  } while (existing.has(code));
  return code;
}

function getEmptyFormValues(): ProductFormValues {
  return {
    internalCode: "",
    supplierCode: "",
    barcode: generateUniqueBarcode(),
    name: "",
    isTypeB: false,
    isTypeR: false,
    glassType: "",
    feature: "",
    manufacturer: "",
    brand: "",
    description: "",
    location: "",
    quantity: 0,
    minimum: 0,
    cost: 0,
    price: 0,
    lastPurchaseDate: "",
    lastSupplier: "",
    status: "ativo",
    notes: "",
  };
}

function buildFormValues(p: Product): ProductFormValues {
  const inventory = p.manufacturers[0].inventories[0];
  return {
    internalCode: p.internalCode,
    supplierCode: p.supplierCode,
    barcode: p.barcode,
    name: p.name,
    isTypeB: (p as any).isTypeB ?? false,
    isTypeR: (p as any).isTypeR ?? false,
    glassType: p.glassType,
    feature: p.feature,
    manufacturer: p.manufacturers[0].manufacturer,
    brand: p.brand,
    description: p.description,
    location: inventory.location,
    quantity: p.manufacturers.reduce(
      (sum, item) => sum + item.inventories.reduce((storeSum, inv) => storeSum + inv.stock, 0),
      0,
    ),
    minimum: inventory.minQuantity,
    cost: p.manufacturers[0].cost,
    price: p.manufacturers[0].price,
    lastPurchaseDate: p.manufacturers[0].lastPurchaseDate,
    lastSupplier: p.manufacturers[0].supplier,
    status: p.status,
    notes: p.notes,
  };
}

export function ProductsPage() {
  const { readOnly } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("id");
  const [savedMessage, setSavedMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [glassTypes, setGlassTypes] = useState([
    "Parabrisa", "Vigia", "Porta dianteira", "Porta traseira", "Lateral fixa", "Quebra-vento", "Teto solar",
  ]);
  const [showAddGlassType, setShowAddGlassType] = useState(false);
  const [newGlassType, setNewGlassType] = useState("");
  const newGlassTypeRef = useRef<HTMLInputElement>(null);

  const [features, setFeatures] = useState(["Verde", "Verde sensor", "Degradê", "Degradê sensor", "Incolor", "Térmico"]);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const newFeatureRef = useRef<HTMLInputElement>(null);

  const [manufacturers, setManufacturers] = useState(["AGC", "Pilkington", "Saint-Gobain", "Fanavid", "XYG", "Outro"]);
  const [showAddManufacturer, setShowAddManufacturer] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const newManufacturerRef = useRef<HTMLInputElement>(null);

  const currentProduct = productId
    ? (products.find((p) => p.id === productId) ?? null)
    : null;

  const isEditing = currentProduct !== null;

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: currentProduct ? buildFormValues(currentProduct) : getEmptyFormValues(),
  });

  useEffect(() => {
    form.reset(currentProduct ? buildFormValues(currentProduct) : getEmptyFormValues());
  }, [productId]);

  const watchedCost = form.watch("cost");
  const watchedPrice = form.watch("price");
  const margin = watchedCost ? ((watchedPrice - watchedCost) / watchedCost) * 100 : 0;

  const fieldLabels: Partial<Record<keyof ProductFormValues, string>> = {
    name: "Nome do produto",
    internalCode: "Código interno",
    brand: "Marca",
    glassType: "Tipo do item",
    feature: "Característica",
    manufacturer: "Fabricante",
    location: "Localização",
    quantity: "Quantidade atual",
    minimum: "Quantidade mínima",
    cost: "Preço de custo",
    price: "Preço de venda",
    lastPurchaseDate: "Última data de compra",
    lastSupplier: "Último fornecedor",
  };

  function handleAddFeature() {
    const trimmed = newFeature.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setFeatures((prev) => [...prev, trimmed]);
    form.setValue("feature", trimmed);
    setNewFeature("");
    setShowAddFeature(false);
  }

  function handleAddManufacturer() {
    const trimmed = newManufacturer.trim();
    if (!trimmed || manufacturers.includes(trimmed)) return;
    setManufacturers((prev) => [...prev, trimmed]);
    form.setValue("manufacturer", trimmed);
    setNewManufacturer("");
    setShowAddManufacturer(false);
  }

  function handleAddGlassType() {
    const trimmed = newGlassType.trim();
    if (!trimmed || glassTypes.includes(trimmed)) return;
    setGlassTypes((prev) => [...prev, trimmed]);
    form.setValue("glassType", trimmed);
    setNewGlassType("");
    setShowAddGlassType(false);
  }

  function handleValidationError(errors: FieldErrors<ProductFormValues>) {
    const missing = (Object.keys(errors) as (keyof ProductFormValues)[])
      .map((key) => fieldLabels[key] ?? key)
      .join(" • ");
    setSaveError(`Campos obrigatórios não preenchidos: ${missing}`);
  }

  async function handleSave(values: ProductFormValues) {
    setSaveError(null);

    try {
      if (supabase) {
        if (isEditing) {
          const { error } = await supabase
            .from("products")
            .update({
              internal_code: values.internalCode,
              barcode: values.barcode,
              name: values.name,
              glass_type: values.glassType,
              feature: values.feature,
              brand: values.brand,
              description: values.description ?? "",
              status: values.status,
              notes: values.notes ?? "",
              is_type_b: values.isTypeB ?? false,
              is_type_r: values.isTypeR ?? false,
            })
            .eq("id", currentProduct.id);
          if (error) { console.error("Supabase update error:", error); throw error; }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("products")
            .insert({
              internal_code: values.internalCode,
              barcode: values.barcode,
              name: values.name,
              glass_type: values.glassType,
              feature: values.feature,
              brand: values.brand,
              description: values.description ?? "",
              status: values.status,
              notes: values.notes ?? "",
              is_type_b: values.isTypeB ?? false,
              is_type_r: values.isTypeR ?? false,
            })
            .select("id")
            .single();
          if (insertError) { console.error("Supabase insert error:", insertError); throw insertError; }

          const productDbId = inserted.id;

          const { data: mf, error: mfError } = await supabase
            .from("product_manufacturers")
            .insert({
              product_id: productDbId,
              manufacturer: values.manufacturer,
              cost: Number(values.cost),
              price: Number(values.price),
              last_purchase_date: values.lastPurchaseDate,
              supplier: values.lastSupplier,
            })
            .select("id")
            .single();
          if (mfError) throw mfError;

          const inventoryRows = stores.map((store, i) => ({
            manufacturer_id: mf.id,
            store_id: store.id,
            location: values.location,
            stock: i === 0 ? Number(values.quantity) : 0,
            min_quantity: Number(values.minimum),
          }));
          const { error: invError } = await supabase
            .from("product_store_inventory")
            .insert(inventoryRows);
          if (invError) throw invError;

          navigate(`/app/produtos?id=${productDbId}`);
        }
      } else {
        // Sem Supabase: salva só em memória (dados perdidos ao recarregar)
        if (isEditing) {
          const index = products.findIndex((p) => p.id === currentProduct.id);
          if (index !== -1) {
            products[index] = {
              ...products[index],
              internalCode: values.internalCode,
              barcode: values.barcode,
              name: values.name,
              glassType: values.glassType as Product["glassType"],
              feature: values.feature as Product["feature"],
              brand: values.brand,
              description: values.description,
              status: values.status,
              notes: values.notes ?? "",
            };
          }
        } else {
          const newId = `prd-${Date.now()}`;
          products.push({
            id: newId,
            internalCode: values.internalCode,
            supplierCode: "",
            barcode: values.barcode,
            name: values.name,
            glassType: values.glassType as Product["glassType"],
            feature: values.feature as Product["feature"],
            brand: values.brand,
            description: values.description,
            photos: [],
            status: values.status,
            notes: values.notes ?? "",
            manufacturers: [{
              id: `mf-${Date.now()}`,
              manufacturer: values.manufacturer,
              cost: Number(values.cost),
              price: Number(values.price),
              lastPurchaseDate: values.lastPurchaseDate,
              supplier: values.lastSupplier,
              inventories: stores.map((store, i) => ({
                id: `inv-${Date.now()}-${i}`,
                storeId: store.id,
                storeName: store.name,
                location: values.location,
                stock: i === 0 ? Number(values.quantity) : 0,
                minQuantity: Number(values.minimum),
              })),
            }],
            compatibilities: [],
          });
          navigate(`/app/produtos?id=${newId}`);
        }
      }

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? "Erro ao salvar produto.");
    }
  }


  return (
    <div className="space-y-6">
      {/* Dados do Produto */}
      <SectionCard
        title={isEditing ? "Editar Produto" : "Novo Produto"}
        description=""
        action={
          <div className="flex items-center gap-3">
            {savedMessage && (
              <span className="text-sm font-medium text-emerald-600">Salvo com sucesso!</span>
            )}
            {saveError && (
              <span className="text-sm font-medium text-rose-600">{saveError}</span>
            )}
            {!readOnly && (
              <Button size="lg" onClick={form.handleSubmit(handleSave as any, handleValidationError as any)}>
                Salvar produto
              </Button>
            )}
          </div>
        }
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Nome em linha completa no topo */}
          <FormField label="Nome do produto" error={form.formState.errors.name?.message} className="md:col-span-2 xl:col-span-4">
            <Input {...form.register("name")} placeholder="Ex: Parabrisa Gol G5 2008/2011" />
          </FormField>

          {/* Linha de códigos */}
          <FormField label="Código interno" error={form.formState.errors.internalCode?.message}>
            <Input {...form.register("internalCode")} />
          </FormField>
          <FormField label="Código de barras">
            <Input {...form.register("barcode")} readOnly className="bg-slate-50 text-slate-500" />
          </FormField>
          <FormField label="Marca" error={form.formState.errors.brand?.message}>
            <Input {...form.register("brand")} />
          </FormField>

          {/* Linha de classificação */}
          <FormField label="Tipo do item" error={form.formState.errors.glassType?.message}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select {...form.register("glassType")} className="flex-1">
                  <option value="">Selecione</option>
                  {glassTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => { setShowAddGlassType((v) => !v); setNewGlassType(""); setTimeout(() => newGlassTypeRef.current?.focus(), 50); }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                  title="Adicionar novo tipo"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {showAddGlassType && (
                <div className="flex gap-2">
                  <Input
                    ref={newGlassTypeRef}
                    value={newGlassType}
                    onChange={(e) => setNewGlassType(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGlassType(); } if (e.key === "Escape") setShowAddGlassType(false); }}
                    placeholder="Nome do novo tipo..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleAddGlassType} disabled={!newGlassType.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <button type="button" onClick={() => setShowAddGlassType(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Característica" error={form.formState.errors.feature?.message}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select {...form.register("feature")} className="flex-1">
                  <option value="">Selecione</option>
                  {features.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => { setShowAddFeature((v) => !v); setNewFeature(""); setTimeout(() => newFeatureRef.current?.focus(), 50); }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                  title="Adicionar nova característica"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {showAddFeature && (
                <div className="flex gap-2">
                  <Input
                    ref={newFeatureRef}
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFeature(); } if (e.key === "Escape") setShowAddFeature(false); }}
                    placeholder="Nova característica..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleAddFeature} disabled={!newFeature.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <button type="button" onClick={() => setShowAddFeature(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Fabricante" error={form.formState.errors.manufacturer?.message}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select {...form.register("manufacturer")} className="flex-1">
                  <option value="">Selecione</option>
                  {manufacturers.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => { setShowAddManufacturer((v) => !v); setNewManufacturer(""); setTimeout(() => newManufacturerRef.current?.focus(), 50); }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 shadow-sm transition-colors hover:border-primary hover:text-primary"
                  title="Adicionar novo fabricante"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {showAddManufacturer && (
                <div className="flex gap-2">
                  <Input
                    ref={newManufacturerRef}
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddManufacturer(); } if (e.key === "Escape") setShowAddManufacturer(false); }}
                    placeholder="Novo fabricante..."
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleAddManufacturer} disabled={!newManufacturer.trim()}>
                    <Check className="size-3.5" />
                  </Button>
                  <button type="button" onClick={() => setShowAddManufacturer(false)} className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Especial">
            <div className="flex flex-row items-center justify-center gap-4 rounded-xl border border-border bg-white px-4 py-2 shadow-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" {...form.register("isTypeB")} className="size-4 accent-primary" />
                <span className="text-sm font-semibold text-slate-700">B</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" {...form.register("isTypeR")} className="size-4 accent-primary" />
                <span className="text-sm font-semibold text-slate-700">R</span>
              </label>
            </div>
          </FormField>
        </form>
      </SectionCard>

      {/* Estoque */}
      <SectionCard
        title="Estoque"
        description=""
      >
        {isEditing && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {stores.map((store) => {
              const inventories = currentProduct.manufacturers.flatMap((manufacturer) =>
                manufacturer.inventories.filter((inventory) => inventory.storeId === store.id),
              );
              const storeStock = inventories.reduce((sum, inventory) => sum + inventory.stock, 0);
              const minimum = inventories.reduce((sum, inventory) => sum + inventory.minQuantity, 0);

              return (
                <div key={store.id} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{store.name}</p>
                  <p className="mt-2 text-sm text-slate-600">Saldo atual: {storeStock} un.</p>
                  <p className="text-sm text-slate-600">Mínimo sugerido: {minimum} un.</p>
                  <p className="text-sm text-slate-600">
                    Localizações: {inventories.map((inventory) => inventory.location).join(" • ")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Loja destino">
            <Select defaultValue={stores[0].id}>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} — {store.city}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Localização" error={form.formState.errors.location?.message}>
            <Input {...form.register("location")} />
          </FormField>
          <FormField label="Quantidade atual" error={form.formState.errors.quantity?.message}>
            <Input type="number" {...form.register("quantity")} />
          </FormField>
          <FormField label="Quantidade mínima" error={form.formState.errors.minimum?.message}>
            <Input type="number" {...form.register("minimum")} />
          </FormField>
          <FormField label="Status" error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </FormField>
        </div>
      </SectionCard>

      {/* Preço */}
      <SectionCard
        title="Preço"
        description="Custos, preço de venda, margem e histórico de compra."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Preço de custo" error={form.formState.errors.cost?.message}>
            <Input type="number" step="0.01" {...form.register("cost")} />
          </FormField>
          <FormField label="Preço de venda" error={form.formState.errors.price?.message}>
            <Input type="number" step="0.01" {...form.register("price")} />
          </FormField>
          <FormField label="Margem automática">
            <Input value={formatPercentage(margin)} disabled />
          </FormField>
          <FormField label="Última data de compra" error={form.formState.errors.lastPurchaseDate?.message}>
            <Input type="date" {...form.register("lastPurchaseDate")} />
          </FormField>
          <FormField label="Último fornecedor" error={form.formState.errors.lastSupplier?.message}>
            <Select {...form.register("lastSupplier")}>
              <option value="">Selecione</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </SectionCard>

      {/* Seções apenas para produtos existentes */}
      {isEditing && (
        <>
          {/* Veículos Compatíveis */}
          <SectionCard
            title="Veículos Compatíveis"
            description="Lista de modelos e versões que utilizam este produto."
          >
            <div className="space-y-3">
              {currentProduct.compatibilities.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    {item.automaker} {item.model} {item.generation}
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.startYear} a {item.endYear} • {item.version}
                  </p>
                  {item.note ? <p className="mt-2 text-sm text-slate-500">{item.note}</p> : null}
                </div>
              ))}
              <Button variant="outline">Adicionar compatibilidade</Button>
            </div>
          </SectionCard>

          {/* Histórico de Compras */}
          <SectionCard
            title="Histórico de Compras"
            description="Registro por fabricante com quantidades, custo e preço de venda."
          >
            <div className="space-y-3">
              {currentProduct.manufacturers.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-5">
                  <p className="font-semibold text-slate-900">{item.manufacturer}</p>
                  <p className="text-slate-600">
                    {item.inventories.reduce((sum, inventory) => sum + inventory.stock, 0)} un.
                  </p>
                  <p className="text-slate-600">{formatCurrency(item.cost)}</p>
                  <p className="text-slate-600">{formatCurrency(item.price)}</p>
                  <p className="text-slate-600">{formatMonthYear(item.lastPurchaseDate)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Fotos e Observações */}
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Fotos"
              description="Imagens do produto para referência visual."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {currentProduct.photos.map((photo) => (
                  <div key={photo} className="rounded-3xl border border-dashed border-border bg-slate-50 p-10 text-center text-sm text-slate-500">
                    Foto do produto
                  </div>
                ))}
                <Button variant="outline" className="h-full min-h-40 border-dashed">
                  Adicionar foto
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              title="Observações"
              description="Anotações e informações adicionais sobre o produto."
            >
              <FormField label="Observações">
                <Textarea {...form.register("notes")} className="min-h-40" />
              </FormField>
            </SectionCard>
          </div>
        </>
      )}

      {/* Observações para novo produto */}
      {!isEditing && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <FormField label="Observações">
            <Textarea {...form.register("notes")} className="min-h-40" />
          </FormField>
        </div>
      )}

      {/* Mensagem de erro visível */}
      {saveError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Erro ao salvar</p>
          <p className="mt-1 text-sm text-rose-600">{saveError}</p>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="mt-2 text-xs text-rose-400 underline hover:text-rose-600"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Botão de salvar no final da página */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div>
            {savedMessage && (
              <span className="text-sm font-medium text-emerald-600">✓ Salvo com sucesso!</span>
            )}
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={form.handleSubmit(handleSave as any, handleValidationError as any)}
          >
            {isEditing ? "Salvar alterações" : "Salvar item no estoque"}
          </Button>
        </div>
      </div>

    </div>
  );
}
