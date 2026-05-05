import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { products, stores } from "@/data/mock-data";
import type { Product } from "@/types/domain";

const [storeA, storeB] = stores;

export function TransferPage() {
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState("");
  const [fromStoreId, setFromStoreId] = useState(storeA.id);
  const [quantity, setQuantity] = useState("1");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toStoreId = fromStoreId === storeA.id ? storeB.id : storeA.id;
  const fromStore = stores.find((s) => s.id === fromStoreId)!;
  const toStore = stores.find((s) => s.id === toStoreId)!;

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return products.filter((p) =>
      `${p.name} ${p.description} ${p.glassType} ${p.feature} ${p.brand}`.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedManufacturer = selectedProduct?.manufacturers.find(
    (m) => m.id === selectedManufacturerId,
  );

  const fromStock =
    selectedManufacturer?.inventories.find((i) => i.storeId === fromStoreId)?.stock ?? 0;
  const toStock =
    selectedManufacturer?.inventories.find((i) => i.storeId === toStoreId)?.stock ?? 0;

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedManufacturerId(product.manufacturers[0].id);
    setQuery(product.name);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function handleTransfer() {
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
    if (qty > fromStock) {
      setErrorMessage(
        `Estoque insuficiente em ${fromStore.name}. Disponível: ${fromStock} un.`,
      );
      return;
    }

    // Atualiza os inventários no array em memória
    const fromInventory = selectedManufacturer.inventories.find(
      (i) => i.storeId === fromStoreId,
    );
    const toInventory = selectedManufacturer.inventories.find(
      (i) => i.storeId === toStoreId,
    );

    if (fromInventory) fromInventory.stock -= qty;
    if (toInventory) toInventory.stock += qty;

    setSuccessMessage(
      `${qty} un. de "${selectedProduct.name}" transferidas de ${fromStore.name} para ${toStore.name}.`,
    );
    setQuantity("1");
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Transferência de Mercadoria"
        description="Busque o produto pela descrição e transfira o estoque entre as lojas."
      >
        <div className="space-y-6">
          {/* Busca */}
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

            {/* Resultados da busca */}
            {searchResults.length > 0 && !selectedProduct && (
              <div className="absolute z-10 mt-1 w-full rounded-2xl border border-border bg-white shadow-lg">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    className="w-full px-4 py-3 text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">
                      {product.glassType} • {product.feature} • {product.brand}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Produto selecionado */}
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

              {/* Fabricante */}
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
                {stores.map((store) => {
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
                  <Select
                    value={fromStoreId}
                    onChange={(e) => setFromStoreId(e.target.value)}
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
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
                  <Input value={toStore.name} disabled className="bg-slate-50 text-slate-500" />
                </FormField>
              </div>

              {/* Resumo da transferência */}
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-slate-50 p-4">
                <div className="flex-1 text-center">
                  <p className="text-sm text-slate-500">{fromStore.name}</p>
                  <p className="text-xl font-bold text-slate-900">{fromStock} un.</p>
                  <p className="text-xs text-slate-400">→ {Math.max(0, fromStock - Number(quantity))} un.</p>
                </div>
                <ArrowLeftRight className="size-6 shrink-0 text-primary" />
                <div className="flex-1 text-center">
                  <p className="text-sm text-slate-500">{toStore.name}</p>
                  <p className="text-xl font-bold text-slate-900">{toStock} un.</p>
                  <p className="text-xs text-slate-400">→ {toStock + Number(quantity)} un.</p>
                </div>
              </div>

              {errorMessage && (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              )}

              <Button size="lg" className="w-full md:w-auto" onClick={handleTransfer}>
                <ArrowLeftRight className="size-4" />
                Confirmar Transferência
              </Button>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
