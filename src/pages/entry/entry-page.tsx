import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { Check, Plus, Printer, Search, X } from "lucide-react";
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
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [entryItems, setEntryItems] = useState<EntryItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers[0].name);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const entryListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      const [storesResp, productsResp, mfResp, invResp] = await Promise.all([
        supabase.from("stores").select("*"),
        supabase.from("products").select("*"),
        supabase.from("product_manufacturers").select("*"),
        supabase.from("product_store_inventory").select("*"),
      ]);
      const dbStores = storesResp.data ?? [];
      const rawProducts = productsResp.data ?? [];
      const rawMf = mfResp.data ?? [];
      const rawInv = invResp.data ?? [];

      if (dbStores.length > 0) setStores(dbStores);

      if (rawProducts.length > 0 && rawMf.length > 0) {
        const mapped: Product[] = rawProducts.map((p: any) => {
          const mfs = rawMf.filter((mf: any) => mf.product_id === p.id);
          const manufacturers: Manufacturer[] = mfs.map((mf: any) => {
            const mfId = mf.id;
            const invs = rawInv.filter(
              (inv: any) => inv.manufacturer_id === mfId || inv.product_manufacturer_id === mfId
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
            compatibilities: [],
          };
        });
        setProducts(mapped);
      }
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

  function handleCodeSearch() {
    if (!codeQuery.trim()) return;
    const rows: SearchRow[] = products
      .filter((item) =>
        `${item.internalCode} ${item.name} ${item.description} ${item.glassType} ${item.feature} ${item.brand}`
          .toLowerCase()
          .includes(codeQuery.toLowerCase()),
      )
      .flatMap((product) =>
        product.manufacturers.map((mf) => ({
          product,
          mf,
          totalStock: mf.inventories.reduce((s, inv) => s + inv.stock, 0),
        })),
      );
    setSearchResults(rows);
    setHasSearched(true);
  }

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

  async function handleSaveEntry() {
    if (!supabase || entryItems.length === 0) return;
    setSaving(true);
    try {
      for (const item of entryItems) {
        for (const store of stores) {
          const qty = Number(item.quantities[store.id] ?? 0);
          if (qty <= 0) continue;
          const inv = item.mf.inventories.find((i) => i.storeId === store.id);
          if (!inv) continue;
          const newStock = (inv.stock ?? 0) + qty;
          await supabase
            .from("product_store_inventory")
            .update({ stock: newStock })
            .eq("id", inv.id);
        }
        await supabase
          .from("product_manufacturers")
          .update({
            supplier: selectedSupplier,
            last_purchase_date: purchaseDate || null,
          })
          .eq("id", item.mf.id);
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
    setSearchResults([]);
    setCodeQuery("");
    setHasSearched(false);
  }

  const isAlreadyAdded = (row: SearchRow) =>
    entryItems.some((item) => item.product.id === row.product.id && item.mf.id === row.mf.id);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Nova entrada"
        description="Busque os produtos, adicione-os à lista e distribua as quantidades entre as lojas."
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
              {/* Search */}
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <FormField label="Descrição do produto">
                  <Input
                    value={codeQuery}
                    onChange={(event) => {
                      setCodeQuery(event.target.value);
                      setSearchResults([]);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSearch()}
                    placeholder="Digite a descrição (ex: Parabrisa Gol G5)"
                  />
                </FormField>
                <div className="flex items-end gap-3">
                  <Button size="lg" className="w-full md:w-auto" onClick={handleCodeSearch}>
                    <Search className="size-4" />
                    Buscar
                  </Button>
                  <Button size="lg" variant="outline" className="w-full md:w-auto" onClick={() => navigate("/app/produtos")}>
                    <Plus className="size-4" />
                    Novo Item
                  </Button>
                </div>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {searchResults.length} produto{searchResults.length > 1 ? "s" : ""} encontrado{searchResults.length > 1 ? "s" : ""} — clique em Adicionar
                  </p>
                  <div className="divide-y divide-border">
                    {searchResults.map((row, i) => {
                      const added = isAlreadyAdded(row);
                      return (
                        <div
                          key={`${row.product.id}-${i}`}
                          className="flex w-full items-center justify-between px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">
                              {row.product.internalCode} • {row.product.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {row.product.glassType} • {row.product.feature} • {row.product.brand}
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
                </div>
              )}

              {hasSearched && searchResults.length === 0 && (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Nenhum produto encontrado para "<strong>{codeQuery}</strong>". Tente outros termos ou cadastre um novo item.
                </p>
              )}

              {/* Entry items list */}
              {entryItems.length > 0 && (
                <div ref={entryListRef} className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Itens da entrada ({entryItems.length})
                  </p>

                  {/* Shared fields */}
                  <div className="grid gap-4 rounded-2xl border border-border bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
                    <FormField label="Fornecedor">
                      <Select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                        {suppliers.map((item) => (
                          <option key={item.id} value={item.name}>{item.name}</option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Data da compra">
                      <Input value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} type="date" />
                    </FormField>
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

                    <div className="mt-7 space-y-3">
                      <div>
                        <p className="text-[13px] font-medium">Estocagem:</p>
                        <p className="mt-1 text-[28px] font-semibold leading-none">
                          {currentLabel.location}
                        </p>
                      </div>

                      <div className="space-y-1 text-[18px] leading-tight">
                        <p>{currentLabel.vehicleLabel.toLowerCase()}</p>
                        <p>{currentLabel.yearRange}</p>
                        <p>{currentLabel.feature}</p>
                        <p>{currentLabel.manufacturer}</p>
                        <p>{currentLabel.purchaseSummary}</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[14px] border-2 border-slate-950 p-3 text-center">
                      <div className="flex justify-center overflow-hidden">
                        <Barcode
                          value={lastItem.product.barcode || "0000000000000"}
                          format="EAN13"
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
