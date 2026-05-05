import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
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

type EntryStatus = "finalizada" | "pendente" | "cancelada";

interface EntryListItem {
  id: string;
  createdAt: string;
  productCode: string;
  productName: string;
  supplier: string;
  status: EntryStatus;
}

const entryList: EntryListItem[] = [
  {
    id: "ent-001",
    createdAt: "2026-05-02 08:15",
    productCode: "VK.PB.103.101",
    productName: "Parabrisa Gol G5 2008/2011",
    supplier: "Pilkington Brasil",
    status: "finalizada",
  },
  {
    id: "ent-002",
    createdAt: "2026-05-02 09:40",
    productCode: "FT.VG.204.201",
    productName: "Vigia Fiat Uno Vivace 2011/2014",
    supplier: "Glass Parts",
    status: "pendente",
  },
  {
    id: "ent-003",
    createdAt: "2026-05-01 17:30",
    productCode: "GM.PD.311.050",
    productName: "Porta Dianteira Onix 2013/2019",
    supplier: "Casa do Vidro",
    status: "cancelada",
  },
];

const badgeClass: Record<EntryStatus, string> = {
  finalizada: "bg-emerald-100 text-emerald-700",
  pendente: "bg-amber-100 text-amber-700",
  cancelada: "bg-rose-100 text-rose-700",
};

export function EntryPage() {
  const navigate = useNavigate();
  const [showNewEntry, setShowNewEntry] = useState(false);
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
    const foundProduct =
      products.find((item) =>
        `${item.name} ${item.description} ${item.glassType} ${item.feature} ${item.brand}`
          .toLowerCase()
          .includes(codeQuery.toLowerCase()),
      ) ?? products[0];

    setSelectedProductId(foundProduct.id);
    setSelectedManufacturer(foundProduct.manufacturers[0].manufacturer);
    setSelectedSupplier(foundProduct.manufacturers[0].supplier);
    setCost(String(foundProduct.manufacturers[0].cost));
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
      {!showNewEntry ? (
        <>
                    <SectionCard
            title="Lista de entradas"
            description="Consulte os lançamentos com status finalizada, pendente ou cancelada."
            action={
              <Button onClick={() => setShowNewEntry(true)}>
                <Plus className="mr-2 size-4" />
                Adicionar Item
              </Button>
            }
          >
            <div className="space-y-3">
              {entryList.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.productCode} • {entry.productName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.createdAt} • {entry.supplier}
                    </p>
                  </div>
                  <Badge className={badgeClass[entry.status]}>{entry.status}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}

      {showNewEntry ? (
        <SectionCard
          title="Nova entrada"
          description="Digite a descrição do produto, carregue os dados e distribua a quantidade entre as duas lojas."
          action={
            <Button variant="outline" onClick={() => setShowNewEntry(false)}>
              Fechar
            </Button>
          }
        >
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <FormField label="Descrição do produto">
                    <Input
                      value={codeQuery}
                      onChange={(event) => setCodeQuery(event.target.value)}
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

                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    Produto encontrado
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

                <div className="flex flex-col gap-3 md:flex-row">
                  <Button size="lg" variant="outline">
                    Salvar
                  </Button>
                  <Button size="lg" onClick={handleFinalize} disabled={totalQuantity <= 0}>
                    Finalizar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Resumo da entrada</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">{totalQuantity} un.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Quantidade total somada entre Taubaté e Pinda.
                  </p>
                </div>

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

                    <div className="mt-6 rounded-[14px] border-2 border-slate-950 p-4 text-center">
                      <div className="mx-auto grid aspect-square w-full max-w-[150px] place-items-center bg-[linear-gradient(90deg,#000_12%,transparent_12%,transparent_24%,#000_24%,#000_36%,transparent_36%,transparent_48%,#000_48%,#000_60%,transparent_60%,transparent_72%,#000_72%,#000_84%,transparent_84%),linear-gradient(#000_12%,transparent_12%,transparent_24%,#000_24%,#000_36%,transparent_36%,transparent_48%,#000_48%,#000_60%,transparent_60%,transparent_72%,#000_72%,#000_84%,transparent_84%)] bg-[length:26px_26px]" />
                      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        {currentLabel.storeName}
                      </p>
                    </div>
                  </div>
                </div>
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

