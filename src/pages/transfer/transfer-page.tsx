import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { products as mockProducts, stores as mockStores } from "@/data/mock-data";
import { supabase } from "@/lib/database";
import type { Product } from "@/types/domain";

type Manufacturer = Product["manufacturers"][0];

export function TransferPage() {
  const [query, setQuery] = useState("");
  const [glassTypeFilter, setGlassTypeFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState("");
  const [fromStoreId, setFromStoreId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [allProducts, setAllProducts] = useState<Product[]>(mockProducts);
  const [allStores, setAllStores] = useState(mockStores);

  async function fetchData() {
    if (!supabase) return;
    const [storesResp, productsResp, mfResp, invResp] = await Promise.all([
      supabase.from("stores").select("*"),
      supabase.from("products").select("*"),
      supabase.from("product_manufacturers").select("*"),
      supabase.from("product_store_inventory").select("*"),
    ]);
    const stores = storesResp.data ?? [];
    const rawProducts = productsResp.data ?? [];
    const rawMf = mfResp.data ?? [];
    const rawInv = invResp.data ?? [];

    if (stores.length > 0) {
      setAllStores(stores);
      setFromStoreId((prev) => prev || stores[0].id);
    }

    if (rawProducts.length > 0) {
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
              const invStore = stores.find((s: any) => s.id === inv.store_id);
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
      setAllProducts(mapped);
    }
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (allStores.length > 0 && !fromStoreId) {
      setFromStoreId(allStores[0].id);
    }
  }, [allStores, fromStoreId]);

  const toStoreId = useMemo(() => {
    const others = allStores.filter((s) => s.id !== fromStoreId);
    return others[0]?.id ?? "";
  }, [fromStoreId, allStores]);

  const fromStore = allStores.find((s) => s.id === fromStoreId);
  const toStore = allStores.find((s) => s.id === toStoreId);

  const glassTypes = useMemo(
    () => [...new Set(allProducts.map((p) => p.glassType).filter(Boolean))].sort(),
    [allProducts],
  );

  const searchResults = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let pool = allProducts;
    if (glassTypeFilter) pool = pool.filter((p) => p.glassType === glassTypeFilter);
    if (terms.length === 0) return [];
    return pool.filter((p) => {
      const text = `${p.internalCode} ${p.name} ${p.description} ${p.glassType} ${p.feature} ${p.brand}`.toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [query, glassTypeFilter, allProducts]);

  const selectedManufacturer: Manufacturer | undefined = selectedProduct?.manufacturers.find(
    (m) => m.id === selectedManufacturerId,
  );

  const fromStock = selectedManufacturer?.inventories.find((i) => i.storeId === fromStoreId)?.stock ?? 0;
  const toStock = selectedManufacturer?.inventories.find((i) => i.storeId === toStoreId)?.stock ?? 0;

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedManufacturerId(product.manufacturers[0]?.id ?? "");
    setQuery(product.name);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleTransfer() {
    setSuccessMessage(null);
    setErrorMessage(null);

    const qty = Number(quantity);
    if (!selectedProduct || !selectedManufacturer) {
      setErrorMessage("Selecione um produto.");
      return;
    }
    if (!qty || qty <= 0) {
      setErrorMessage("Informe uma quantidade válida.");
      return;
    }
    if (!supabase) {
      setErrorMessage("Banco de dados não disponível.");
      return;
    }

    setSaving(true);
    try {
      const mfId = selectedManufacturer.id;

      // Busca dados frescos do banco para evitar usar estado desatualizado
      const { data: freshInvData, error: fetchErr } = await supabase
        .from("product_store_inventory")
        .select("id, stock, store_id, manufacturer_id, product_manufacturer_id")
        .or(`manufacturer_id.eq.${mfId},product_manufacturer_id.eq.${mfId}`);
      if (fetchErr) throw fetchErr;

      const freshFrom = (freshInvData ?? []).find((i: any) => i.store_id === fromStoreId);
      const freshTo   = (freshInvData ?? []).find((i: any) => i.store_id === toStoreId);

      if (!freshFrom) throw new Error(`Inventário de origem não encontrado em ${fromStore?.name}.`);
      if (freshFrom.stock < qty)
        throw new Error(`Estoque insuficiente em ${fromStore?.name}. Disponível: ${freshFrom.stock} un.`);

      // Debita da origem
      const { error: err1 } = await supabase
        .from("product_store_inventory")
        .update({ stock: freshFrom.stock - qty })
        .eq("id", freshFrom.id);
      if (err1) throw err1;

      // Credita no destino (ou cria registro se não existir)
      if (freshTo) {
        const { error: err2 } = await supabase
          .from("product_store_inventory")
          .update({ stock: freshTo.stock + qty })
          .eq("id", freshTo.id);
        if (err2) throw err2;
      } else {
        const { error: err2 } = await supabase
          .from("product_store_inventory")
          .insert({
            manufacturer_id: mfId,
            product_manufacturer_id: mfId,
            store_id: toStoreId,
            stock: qty,
            min_quantity: 0,
          });
        if (err2) throw err2;
      }

      // Recarrega dados para refletir os novos saldos
      await fetchData();

      setSuccessMessage(
        `${qty} un. de "${selectedProduct.name}" transferidas de ${fromStore?.name} para ${toStore?.name}.`,
      );
      setQuantity("1");
    } catch (err: any) {
      console.error("Erro na transferência:", err);
      const detail = err?.message ?? err?.details ?? JSON.stringify(err);
      setErrorMessage(`Erro: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Transferência de Mercadoria"
        description="Busque o produto pela descrição e transfira o estoque entre as lojas."
      >
        <div className="space-y-6">
          {/* Filtros + Busca */}
          <div className="grid gap-3 md:grid-cols-[auto_1fr]">
            <FormField label="Tipo do produto">
              <Select
                value={glassTypeFilter}
                onChange={(e) => {
                  setGlassTypeFilter(e.target.value);
                  setSelectedProduct(null);
                  setQuery("");
                }}
                className="min-w-[180px]"
              >
                <option value="">Todos os tipos</option>
                {glassTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </FormField>

            <div className="relative">
              <FormField label="Buscar produto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedProduct(null);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    placeholder="Digite a descrição, tipo ou marca..."
                    className="pl-10"
                  />
                </div>
              </FormField>

              {searchResults.length > 0 && !selectedProduct && (
                <div className="absolute z-10 mt-1 w-full rounded-2xl border border-border bg-white shadow-lg">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      className="w-full px-4 py-3 text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <p className="font-semibold text-slate-900">{product.internalCode} • {product.name}</p>
                      <p className="text-sm text-slate-500">
                        {product.glassType} • {product.feature} • {product.brand}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedProduct && (
            <>
              <div className="rounded-2xl border border-border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Produto selecionado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {selectedProduct.internalCode} • {selectedProduct.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProduct.glassType} • {selectedProduct.feature} • {selectedProduct.brand}
                </p>
              </div>

              {selectedProduct.manufacturers.length > 1 && (
                <FormField label="Fabricante">
                  <Select
                    value={selectedManufacturerId}
                    onChange={(e) => setSelectedManufacturerId(e.target.value)}
                  >
                    {selectedProduct.manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.manufacturer}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              {/* Estoque atual */}
              <div className="grid gap-4 md:grid-cols-2">
                {allStores.map((store) => {
                  const stock =
                    selectedManufacturer?.inventories.find((i) => i.storeId === store.id)?.stock ?? 0;
                  return (
                    <div
                      key={store.id}
                      className="rounded-2xl border border-border bg-white p-4 text-center"
                    >
                      <p className="text-sm font-semibold text-slate-700">{store.name}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{stock}</p>
                      <p className="text-sm text-slate-500">unidades</p>
                    </div>
                  );
                })}
              </div>

              {/* Configuração da transferência */}
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Origem">
                  <Select value={fromStoreId} onChange={(e) => setFromStoreId(e.target.value)}>
                    {allStores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Quantidade">
                  <Input
                    type="number"
                    min="1"
                    max={fromStock}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </FormField>

                <FormField label="Destino">
                  <Input value={toStore?.name ?? ""} disabled className="bg-slate-50 text-slate-500" />
                </FormField>
              </div>

              {/* Resumo da transferência */}
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-slate-50 p-4">
                <div className="flex-1 text-center">
                  <p className="text-sm text-slate-500">{fromStore?.name}</p>
                  <p className="text-xl font-bold text-slate-900">{fromStock} un.</p>
                  <p className="text-xs text-slate-400">→ {Math.max(0, fromStock - Number(quantity))} un.</p>
                </div>
                <ArrowLeftRight className="size-6 shrink-0 text-primary" />
                <div className="flex-1 text-center">
                  <p className="text-sm text-slate-500">{toStore?.name}</p>
                  <p className="text-xl font-bold text-slate-900">{toStock} un.</p>
                  <p className="text-xs text-slate-400">→ {toStock + Number(quantity)} un.</p>
                </div>
              </div>

              {errorMessage && (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p>
              )}

              <Button size="lg" className="w-full md:w-auto" onClick={handleTransfer} disabled={saving}>
                <ArrowLeftRight className="size-4" />
                {saving ? "Transferindo..." : "Confirmar Transferência"}
              </Button>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
