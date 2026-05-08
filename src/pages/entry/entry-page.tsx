import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/use-permissions";
import { Plus, Printer, Search } from "lucide-react";
import Barcode from "react-barcode";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { labels, products, stores, suppliers } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";


export function EntryPage() {
  const { readOnly } = usePermissions();
  const navigate = useNavigate();
  const [showNewEntry] = useState(true);
  const [codeQuery, setCodeQuery] = useState("Parabrisa Gol G5");
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [selectedManufacturer, setSelectedManufacturer] = useState(
    products[0].manufacturers[0].manufacturer,
  );
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers[0].name);
  const [cost, setCost] = useState(String(products[0].manufacturers[0].cost));
  const [purchaseDate, setPurchaseDate] = useState("2026-05-02");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [storeQuantities, setStoreQuantities] = useState<Record<string, string>>({
    "store-1": "0",
    "store-2": "0",
  });
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  const [productSelected, setProductSelected] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) ?? products[0],
    [selectedProductId],
  );

  const manufacturerOptions = selectedProduct.manufacturers;

  const selectedStock = useMemo(
    () =>
      manufacturerOptions.find((item) => item.manufacturer === selectedManufacturer) ??
      manufacturerOptions[0],
    [manufacturerOptions, selectedManufacturer],
  );

  const currentLabel = useMemo(
    () =>
      labels.find(
        (label) =>
          label.productCode === selectedProduct.internalCode &&
          label.manufacturer === selectedStock.manufacturer.toLowerCase() &&
          label.storeId === stores[0].id,
      ) ?? labels[0],
    [selectedProduct, selectedStock],
  );

  const totalQuantity = useMemo(
    () =>
      Object.values(storeQuantities).reduce(
        (sum, value) => sum + (Number(value) > 0 ? Number(value) : 0),
        0,
      ),
    [storeQuantities],
  );

  function handleCodeSearch() {
    if (!codeQuery.trim()) return;
    const results = products.filter((item) =>
      `${item.internalCode} ${item.name} ${item.description} ${item.glassType} ${item.feature} ${item.brand}`
        .toLowerCase()
        .includes(codeQuery.toLowerCase()),
    );
    setSearchResults(results);
    setProductSelected(false);
  }

  function handleSelectProduct(product: typeof products[0]) {
    setSelectedProductId(product.id);
    setSelectedManufacturer(product.manufacturers[0].manufacturer);
    setSelectedSupplier(product.manufacturers[0].supplier);
    setCost(String(product.manufacturers[0].cost));
    setStoreQuantities({ "store-1": "0", "store-2": "0" });
    setSearchResults([]);
    setProductSelected(true);
  }

  function updateStoreQuantity(storeId: string, value: string) {
    setStoreQuantities((current) => ({
      ...current,
      [storeId]: value,
    }));
  }

  function handleFinalize() {
    setPrintModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {showNewEntry ? (
        <SectionCard
          title="Nova entrada"
          description="Digite a descrição do produto, carregue os dados e distribua a quantidade entre as duas lojas."
        >
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <FormField label="Descrição do produto">
                    <Input
                      value={codeQuery}
                      onChange={(event) => { setCodeQuery(event.target.value); setProductSelected(false); setSearchResults([]); }}
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

                {/* Resultados da busca */}
                {searchResults.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                    <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {searchResults.length} produto{searchResults.length > 1 ? "s" : ""} encontrado{searchResults.length > 1 ? "s" : ""} — selecione um
                    </p>
                    <div className="divide-y divide-border">
                      {searchResults.map((product) => {
                        const totalStock = product.manufacturers.reduce(
                          (sum, m) => sum + m.inventories.reduce((s, inv) => s + inv.stock, 0),
                          0,
                        );
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleSelectProduct(product)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {product.internalCode} • {product.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {product.glassType} • {product.feature} • {product.brand}
                              </p>
                            </div>
                            <span className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${totalStock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {totalStock} un.
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {searchResults.length === 0 && codeQuery.trim() && !productSelected && (
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Nenhum produto encontrado para "<strong>{codeQuery}</strong>". Tente outros termos ou cadastre um novo item.
                  </p>
                )}

                {/* Formulário e distribuição — só após selecionar produto */}
                {productSelected && (
                <>
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                    Produto selecionado
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {selectedProduct.internalCode} • {selectedProduct.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedProduct.glassType} • {selectedProduct.feature} • {selectedProduct.brand}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Fabricante">
                    <Select
                      value={selectedManufacturer}
                      onChange={(event) => setSelectedManufacturer(event.target.value)}
                    >
                      {manufacturerOptions.map((item) => (
                        <option key={item.id} value={item.manufacturer}>
                          {item.manufacturer}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Fornecedor">
                    <Select
                      value={selectedSupplier}
                      onChange={(event) => setSelectedSupplier(event.target.value)}
                    >
                      {suppliers.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Preço de custo">
                    <Input
                      value={cost}
                      onChange={(event) => setCost(event.target.value)}
                      type="number"
                    />
                  </FormField>
                  <FormField label="Data da compra">
                    <Input
                      value={purchaseDate}
                      onChange={(event) => setPurchaseDate(event.target.value)}
                      type="date"
                    />
                  </FormField>
                  <FormField label="Número da NF">
                    <Input
                      value={invoiceNumber}
                      onChange={(event) => setInvoiceNumber(event.target.value)}
                      placeholder="000123"
                    />
                  </FormField>
                </div>

                <FormField label="Observação">
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
                </FormField>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Distribuição por loja</p>
                  {stores.map((store) => {
                    const inventory =
                      selectedStock.inventories.find((item) => item.storeId === store.id) ??
                      selectedStock.inventories[0];

                    return (
                      <div
                        key={store.id}
                        className="grid gap-4 rounded-2xl border border-border bg-white p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{store.name}</p>
                          <p className="text-sm text-slate-500">
                            Estoque atual: {inventory?.stock ?? 0} • Local: {inventory?.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Quantidade
                          </p>
                          <Input
                            type="number"
                            min="0"
                            value={storeQuantities[store.id] ?? "0"}
                            onChange={(event) => updateStoreQuantity(store.id, event.target.value)}
                          />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Custo
                          </p>
                          <Input disabled value={formatCurrency(selectedStock.cost)} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!readOnly && (
                  <div className="flex flex-col gap-3 md:flex-row">
                    <Button size="lg" variant="outline">
                      Salvar
                    </Button>
                    <Button size="lg" onClick={handleFinalize} disabled={totalQuantity <= 0}>
                      Finalizar
                    </Button>
                  </div>
                )}
                </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Resumo da entrada
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{totalQuantity} un.</p>
                    <p className="text-xs text-slate-400">Taubaté + Pinda</p>
                  </div>
                  <Button
                    size="sm"
                    variant={showLabel ? "default" : "outline"}
                    onClick={() => setShowLabel((v) => !v)}
                  >
                    <Printer className="size-4" />
                    Imprimir etiqueta
                  </Button>
                </div>

                {showLabel && (
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
                            value={selectedProduct.barcode || "0000000000000"}
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

                    <div className="mt-4 flex gap-2">
                      <Button className="flex-1" onClick={() => window.print()}>
                        <Printer className="size-4" />
                        Imprimir
                      </Button>
                      <Button variant="outline" onClick={() => setShowLabel(false)}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entrada finalizada</DialogTitle>
            <DialogDescription>
              Deseja imprimir as etiquetas deste lançamento agora?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1">Sim, imprimir etiquetas</Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPrintModalOpen(false)}
            >
              Não imprimir agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

