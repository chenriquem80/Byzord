import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { Camera, Check, Plus, Printer, X } from "lucide-react";
import Barcode from "react-barcode";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { labels, products as mockProducts, stores as mockStores, suppliers } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/lib/database";
import type { Product } from "@/types/domain";

type Manufacturer = Product["manufacturers"][0];

type SearchRow = {
  product: Product;
  mf: Manufacturer;
  totalStock: number;
};

type EntryItem = {
  key: string;
  product: Product;
  mf: Manufacturer;
  quantities: Record<string, string>;
};

export function EntryPage() {
  const { readOnly } = usePermissions();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [stores, setStores] = useState(mockStores);
  const [codeQuery, setCodeQuery] = useState("");
  const [glassTypeFilter, setGlassTypeFilter] = useState("");
  const [entryItems, setEntryItems] = useState<EntryItem[]>([]);
  const [suppliersList, setSuppliersList] = useState<string[]>(suppliers.map((s) => s.name));
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");
  const newSupplierRef = useRef<HTMLInputElement>(null);
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers[0].name);
  const [manufacturersList, setManufacturersList] = useState<string[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [showAddManufacturer, setShowAddManufacturer] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const newManufacturerRef = useRef<HTMLInputElement>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [entryPhoto, setEntryPhoto] = useState<string | null>(null);
  const entryPhotoRef = useRef<HTMLInputElement>(null);
  const [isTypeB, setIsTypeB] = useState(false);
  const [isTypeR, setIsTypeR] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const entryListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      const [storesResp, productsResp, mfResp, invResp, compatResp] = await Promise.all([
        supabase.from("stores").select("*"),
        supabase.from("products").select("*"),
        supabase.from("product_manufacturers").select("*"),
        supabase.from("product_store_inventory").select("*"),
        supabase.from("product_vehicle_compatibility").select("*, vehicles(*)"),
      ]);
      const dbStores = storesResp.data ?? [];
      const rawProducts = productsResp.data ?? [];
      const rawMf = mfResp.data ?? [];
      const rawInv = invResp.data ?? [];
      const rawCompat = compatResp.data ?? [];

      if (dbStores.length > 0) setStores(dbStores);

      const uniqueSuppliers = [...new Set(rawMf.map((mf: any) => mf.supplier).filter(Boolean))] as string[];
      const uniqueManufacturers = [...new Set(rawMf.map((mf: any) => mf.manufacturer).filter(Boolean))] as string[];
      if (uniqueSuppliers.length > 0) {
        setSuppliersList(uniqueSuppliers);
        setSelectedSupplier(uniqueSuppliers[0]);
      }
      if (uniqueManufacturers.length > 0) setManufacturersList(uniqueManufacturers);

      if (rawProducts.length > 0) {
        const mapped: Product[] = rawProducts.map((p: any) => {
          const mfs = rawMf.filter((mf: any) => mf.product_id === p.id);
          const manufacturers: Manufacturer[] = mfs.map((mf: any) => {
            const mfId = mf.id;
            const invs = rawInv.filter(
              (inv: any) => inv.manufacturer_id === mfId
            );
            return {
              id: mf.id,
              manufacturer: mf.manufacturer ?? "",
              cost: mf.cost ?? mf.current_cost ?? 0,
              price: mf.price ?? mf.sale_price ?? 0,
              lastPurchaseDate: mf.last_purchase_date ?? "",
              supplier: mf.supplier ?? "",
              inventories: invs.map((inv: any) => {
                const invStore = dbStores.find((s: any) => s.id === inv.store_id);
                return {
                  id: inv.id,
                  storeId: inv.store_id,
                  storeName: invStore?.name ?? "",
                  location: inv.location ?? "",
                  stock: inv.stock ?? inv.stock_quantity ?? 0,
                  minQuantity: inv.min_quantity ?? inv.minimum_quantity ?? 0,
                };
              }),
            };
          });
          return {
            id: p.id,
            internalCode: p.internal_code ?? "",
            supplierCode: "",
            barcode: p.barcode ?? "",
            name: p.name ?? "",
            glassType: p.glass_type ?? "",
            feature: p.feature ?? "",
            brand: p.brand ?? "",
            description: p.description ?? "",
            photos: [],
            status: p.status ?? "ativo",
            notes: p.notes ?? "",
            manufacturers,
            compatibilities: rawCompat
              .filter((c: any) => c.product_id === p.id)
              .map((c: any) => ({
                id: c.id,
                automaker: c.vehicles?.automaker ?? "",
                model: c.vehicles?.model ?? "",
                generation: c.vehicles?.generation ?? "",
                startYear: c.vehicles?.start_year ?? 0,
                endYear: c.vehicles?.end_year ?? 0,
                version: c.vehicles?.version ?? "",
                note: c.note ?? "",
              })),
          };
        });
        setProducts(mapped);
      }
      setLoaded(true);
    }
    fetchData();
  }, []);

  const lastItem = entryItems.length > 0 ? entryItems[entryItems.length - 1] : null;

  const currentLabel = useMemo(() => {
    if (!lastItem) return labels[0];
    return (
      labels.find(
        (label) =>
          label.productCode === lastItem.product.internalCode &&
          label.manufacturer === lastItem.mf.manufacturer.toLowerCase() &&
          label.storeId === stores[0].id,
      ) ?? labels[0]
    );
  }, [lastItem]);

  const totalQuantity = useMemo(
    () =>
      entryItems.reduce((sum, item) =>
        sum + Object.values(item.quantities).reduce((s, v) => s + (Number(v) > 0 ? Number(v) : 0), 0),
        0,
      ),
    [entryItems],
  );

  const searchResults = useMemo<SearchRow[]>(() => {
    const terms = codeQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    return products
      .filter((item) => {
        const matchesType = glassTypeFilter ? item.glassType === glassTypeFilter : true;
        if (!matchesType) return false;
        if (terms.length === 0) return true;
        const compat = item.compatibilities.map((c) => `${c.automaker} ${c.model} ${c.generation} ${c.version}`).join(" ");
        const text = `${item.internalCode} ${item.name} ${item.description} ${item.glassType} ${item.feature} ${item.brand} ${compat}`.toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .flatMap((product) =>
        product.manufacturers.map((mf) => ({
          product,
          mf,
          totalStock: mf.inventories.reduce((s, inv) => s + inv.stock, 0),
        })),
      )
      .filter((row) => {
        const key = `${row.product.id}-${row.mf.manufacturer}-${row.mf.cost}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [codeQuery, glassTypeFilter, products]);

  function handleAddItem(row: SearchRow) {
    const key = `${row.product.id}-${row.mf.id}-${Date.now()}`;
    const quantities: Record<string, string> = {};
    stores.forEach((store) => { quantities[store.id] = "0"; });
    setEntryItems((prev) => [...prev, { key, product: row.product, mf: row.mf, quantities }]);
    setTimeout(() => entryListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function updateItemQuantity(key: string, storeId: string, value: string) {
    setEntryItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, quantities: { ...item.quantities, [storeId]: value } }
          : item,
      ),
    );
  }

  function removeItem(key: string) {
    setEntryItems((prev) => prev.filter((item) => item.key !== key));
  }

  function handleAddManufacturer() {
    const trimmed = newManufacturer.trim();
    if (!trimmed || manufacturersList.includes(trimmed)) return;
    setManufacturersList((prev) => [...prev, trimmed]);
    setSelectedManufacturer(trimmed);
    setShowAddManufacturer(false);
    setNewManufacturer("");
  }

  function handleAddSupplier() {
    const trimmed = newSupplier.trim();
    if (!trimmed || suppliersList.includes(trimmed)) return;
    setSuppliersList((prev) => [...prev, trimmed]);
    setSelectedSupplier(trimmed);
    setShowAddSupplier(false);
    setNewSupplier("");
  }

  async function handleSaveEntry() {
    if (!supabase || entryItems.length === 0) return;
    setSaving(true);
    const specialCond = isTypeB && isTypeR ? "BR" : isTypeB ? "B" : isTypeR ? "R" : null;
    try {
      for (const item of entryItems) {
        const isDifferentMf =
          selectedManufacturer && selectedManufacturer !== item.mf.manufacturer;

        if (!isDifferentMf) {
          // Mesmo fabricante: incrementa estoque nas linhas existentes
          for (const store of stores) {
            const qty = Number(item.quantities[store.id] ?? 0);
            if (qty <= 0) continue;
            const inv = item.mf.inventories.find(
              (i) => i.storeId === store.id && (i as any).special_condition === specialCond,
            );
            if (inv) {
              await supabase
                .from("product_store_inventory")
                .update({ stock: (inv.stock ?? 0) + qty })
                .eq("id", inv.id);
            } else {
              await supabase.from("product_store_inventory").insert({
                manufacturer_id: item.mf.id,
                store_id: store.id,
                stock: qty,
                min_quantity: 0,
                special_condition: specialCond,
              });
            }
          }
          await supabase
            .from("product_manufacturers")
            .update({ supplier: selectedSupplier, last_purchase_date: purchaseDate || null })
            .eq("id", item.mf.id);
        } else {
          const existingMf = item.product.manufacturers.find(
            (m) => m.manufacturer === selectedManufacturer,
          );

          if (existingMf) {
            for (const store of stores) {
              const qty = Number(item.quantities[store.id] ?? 0);
              if (qty <= 0) continue;
              const inv = existingMf.inventories.find(
                (i) => i.storeId === store.id && (i as any).special_condition === specialCond,
              );
              if (inv) {
                await supabase
                  .from("product_store_inventory")
                  .update({ stock: (inv.stock ?? 0) + qty })
                  .eq("id", inv.id);
              } else {
                await supabase.from("product_store_inventory").insert({
                  manufacturer_id: existingMf.id,
                  store_id: store.id,
                  stock: qty,
                  min_quantity: 0,
                  special_condition: specialCond,
                });
              }
            }
            await supabase
              .from("product_manufacturers")
              .update({ supplier: selectedSupplier, last_purchase_date: purchaseDate || null })
              .eq("id", existingMf.id);
          } else {
            const { data: newMfData, error: mfErr } = await supabase
              .from("product_manufacturers")
              .insert({
                product_id: item.product.id,
                manufacturer: selectedManufacturer,
                cost: item.mf.cost,
                price: item.mf.price,
                supplier: selectedSupplier,
                last_purchase_date: purchaseDate || null,
              })
              .select()
              .single();
            if (mfErr) throw mfErr;

            for (const store of stores) {
              const qty = Number(item.quantities[store.id] ?? 0);
              if (qty <= 0) continue;
              await supabase.from("product_store_inventory").insert({
                manufacturer_id: newMfData.id,
                store_id: store.id,
                stock: qty,
                min_quantity: 0,
                special_condition: specialCond,
              });
            }
          }
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      handleCancel();
    } catch (err) {
      console.error("Erro ao salvar entrada:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEntryItems([]);
    setCodeQuery("");
    setGlassTypeFilter("");
    setSelectedManufacturer("");
    setShowAddSupplier(false);
    setNewSupplier("");
    setShowAddManufacturer(false);
    setNewManufacturer("");
  }

  const isAlreadyAdded = (row: SearchRow) =>
    entryItems.some((item) => item.product.id === row.product.id && item.mf.id === row.mf.id);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Nova entrada"
        description={loaded ? `${products.length} produto${products.length !== 1 ? "s" : ""} cadastrado${products.length !== 1 ? "s" : ""}` : "Carregando produtos..."}
      >
        <div className="space-y-6">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <Check className="size-4" />
              Entrada registrada com sucesso!
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {/* Search — igual ao estoque: texto + dropdown de tipo */}
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <Input
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value)}
                  placeholder="Digite o nome do produto (ex: Parabrisa Gol)"
                />
                <Select value={glassTypeFilter} onChange={(e) => setGlassTypeFilter(e.target.value)} placeholder="Todos os itens">
                  {[...new Set(products.map((p) => p.glassType).filter(Boolean))].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
                <Button variant="outline" onClick={() => navigate("/app/produtos")}>
                  <Plus className="size-4" />
                  Novo Item
                </Button>
              </div>

              {/* Search results — exibe assim que há texto ou filtro */}
              {(codeQuery.trim() || glassTypeFilter) && (
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {searchResults.length} produto{searchResults.length !== 1 ? "s" : ""} encontrado{searchResults.length !== 1 ? "s" : ""}
                    {searchResults.length > 0 ? " — clique em Adicionar" : ""}
                  </p>
                  {searchResults.length > 0 && (
                    <div className="divide-y divide-border">
                      {searchResults.map((row, i) => {
                        const added = isAlreadyAdded(row);
                        return (
                          <div
                            key={`${row.product.id}-${i}`}
                            className="flex w-full items-center justify-between px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900">{row.product.name}</p>
                                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                  {row.product.feature}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500">
                                {row.product.glassType} • {row.product.brand}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-slate-400">
                                Fabricante: {row.mf.manufacturer} • Custo: {formatCurrency(row.mf.cost)}
                              </p>
                            </div>
                            <div className="ml-4 flex shrink-0 items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.totalStock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                {row.totalStock} un.
                              </span>
                              {added ? (
                                <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-slate-400">
                                  Adicionado
                                </span>
                              ) : (
                                <Button size="sm" onClick={() => handleAddItem(row)}>
                                  <Plus className="size-3.5" />
                                  Adicionar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Entry items list */}
              {entryItems.length > 0 && (
                <div ref={entryListRef} className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Itens da entrada ({entryItems.length})
                  </p>

                  {/* Shared fields */}
                  <div className="grid gap-4 rounded-2xl border border-border bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField label="Fornecedor">
                      {showAddSupplier ? (
                        <div className="flex gap-2">
                          <Input
                            ref={newSupplierRef}
                            value={newSupplier}
                            onChange={(e) => setNewSupplier(e.target.value)}
                            placeholder="Nome do fornecedor"
                            onKeyDown={(e) => e.key === "Enter" && handleAddSupplier()}
                          />
                          <Button type="button" size="sm" onClick={handleAddSupplier}><Check className="size-4" /></Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddSupplier(false); setNewSupplier(""); }}><X className="size-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="flex-1">
                            {suppliersList.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Select>
                          <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddSupplier(true); setTimeout(() => newSupplierRef.current?.focus(), 50); }}>
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      )}
                    </FormField>
                    <FormField label="Fabricante">
                      {showAddManufacturer ? (
                        <div className="flex gap-2">
                          <Input
                            ref={newManufacturerRef}
                            value={newManufacturer}
                            onChange={(e) => setNewManufacturer(e.target.value)}
                            placeholder="Nome do fabricante"
                            onKeyDown={(e) => e.key === "Enter" && handleAddManufacturer()}
                          />
                          <Button type="button" size="sm" onClick={handleAddManufacturer}><Check className="size-4" /></Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddManufacturer(false); setNewManufacturer(""); }}><X className="size-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Select value={selectedManufacturer} onChange={(e) => setSelectedManufacturer(e.target.value)} className="flex-1">
                            <option value="">Selecione</option>
                            {manufacturersList.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </Select>
                          <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddManufacturer(true); setTimeout(() => newManufacturerRef.current?.focus(), 50); }}>
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      )}
                    </FormField>
                    <FormField label="Data da compra">
                      <Input value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} type="date" />
                    </FormField>
                    <div className="space-y-4">
                      <FormField label="Condição especial">
                        <div className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-2.5 shadow-sm">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                            <input type="checkbox" checked={isTypeB} onChange={(e) => setIsTypeB(e.target.checked)} className="size-4 accent-primary" />
                            B
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                            <input type="checkbox" checked={isTypeR} onChange={(e) => setIsTypeR(e.target.checked)} className="size-4 accent-primary" />
                            R
                          </label>
                        </div>
                      </FormField>
                      <FormField label="Foto">
                        <input
                          ref={entryPhotoRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => setEntryPhoto(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        {entryPhoto ? (
                          <div className="relative w-fit">
                            <img
                              src={entryPhoto}
                              alt="Foto da entrada"
                              className="h-24 w-36 rounded-xl border border-border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setEntryPhoto(null)}
                              className="absolute -right-2 -top-2 rounded-full border border-border bg-white p-0.5 text-slate-500 shadow hover:text-rose-600"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" className="w-full" onClick={() => entryPhotoRef.current?.click()}>
                            <Camera className="size-4" />
                            Adicionar foto
                          </Button>
                        )}
                      </FormField>
                    </div>
                    <FormField label="Número da NF">
                      <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="000123" />
                    </FormField>
                    <FormField label="Observação">
                      <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                    </FormField>
                  </div>

                  {/* Per-item rows */}
                  {entryItems.map((item) => {
                    const itemTotal = Object.values(item.quantities).reduce(
                      (s, v) => s + (Number(v) > 0 ? Number(v) : 0), 0,
                    );
                    return (
                      <div
                        key={item.key}
                        className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                      >
                        <div className="flex items-start justify-between border-b border-border bg-slate-50 px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.product.internalCode} • {item.product.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {item.product.glassType} • {item.product.feature} • Fabricante: {item.mf.manufacturer} • Custo: {formatCurrency(item.mf.cost)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="ml-4 shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <div className="divide-y divide-border">
                          {stores.map((store) => {
                            const inventory =
                              item.mf.inventories.find((inv) => inv.storeId === store.id) ??
                              item.mf.inventories[0];
                            return (
                              <div
                                key={store.id}
                                className="grid gap-4 px-4 py-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]"
                              >
                                <div>
                                  <p className="font-medium text-slate-800">{store.name}</p>
                                  <p className="text-sm text-slate-500">
                                    Estoque atual: {inventory?.stock ?? 0} • Local: {inventory?.location}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Quantidade</p>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.quantities[store.id] ?? "0"}
                                    onChange={(e) => updateItemQuantity(item.key, store.id, e.target.value)}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Custo</p>
                                  <Input disabled value={formatCurrency(item.mf.cost)} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="border-t border-border bg-slate-50 px-4 py-2 text-right text-xs font-medium text-slate-500">
                          Subtotal: <span className="font-semibold text-slate-800">{itemTotal} un.</span>
                        </div>
                      </div>
                    );
                  })}

                  {!readOnly && (
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Button
                        size="lg"
                        onClick={handleSaveEntry}
                        disabled={saving || totalQuantity <= 0}
                      >
                        {saving ? "Salvando..." : "Adicionar"}
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleCancel}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resumo da entrada
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{totalQuantity} un.</p>
                  <p className="text-xs text-slate-400">Taubaté + Pinda</p>
                </div>
                {lastItem && (
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Printer className="size-4" />
                    Imprimir etiqueta
                  </Button>
                )}
              </div>

              {lastItem && (
                <div className="rounded-3xl border border-dashed border-border bg-slate-100 p-5">
                  <div className="mx-auto w-full max-w-[280px] rounded-[22px] bg-white p-5 text-slate-950 shadow-sm">
                    <p className="text-[13px] font-medium">Codigo:</p>
                    <p className="mt-2 break-all text-[30px] font-semibold leading-none tracking-tight">
                      {currentLabel.productCode}
                    </p>

                    <div className="mt-7 space-y-1 text-[18px] leading-tight">
                      <p>{currentLabel.vehicleLabel.toLowerCase()}</p>
                      <p>{currentLabel.yearRange}</p>
                      <p>{currentLabel.feature}</p>
                      <p>{currentLabel.manufacturer}</p>
                      <p>{currentLabel.purchaseSummary}</p>
                    </div>

                    {lastItem.product.barcode && (
                      <div className="mt-6 rounded-[14px] border-2 border-slate-950 p-3 text-center">
                        <div className="flex justify-center overflow-hidden">
                          <Barcode
                            value={lastItem.product.barcode}
                            format="CODE128"
                            width={1.6}
                            height={60}
                            fontSize={11}
                            margin={0}
                            background="transparent"
                          />
                        </div>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          {currentLabel.storeName}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button className="w-full" onClick={() => window.print()}>
                      <Printer className="size-4" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
