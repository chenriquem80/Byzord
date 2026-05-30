import { useState, useMemo, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { products as mockProducts } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";
import { MarketPriceComparison } from "@/components/shared/market-price-comparison";
import { supabase } from "@/lib/database";
import type { Product } from "@/types/domain";
import { Search, Calculator, Eye, EyeOff, X } from "lucide-react";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function QuotesPage() {
  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [glassTypeFilter, setGlassTypeFilter] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [showValues, setShowValues] = useState(false);

  // Carrega produtos do Supabase
  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [{ data: pData }, { data: mfData }, { data: compatData }] = await Promise.all([
        supabase.from("products").select("*").eq("status", "ativo"),
        supabase.from("product_manufacturers").select("*"),
        supabase.from("product_vehicle_compatibility").select("*, vehicles(*)"),
      ]);
      if (!pData || !mfData) return;
      const rawCompat = compatData ?? [];
      const mapped: Product[] = pData.map((p: any) => ({
        id: p.id,
        internalCode: p.internal_code ?? "",
        supplierCode: p.supplier_code ?? "",
        barcode: p.barcode ?? "",
        name: p.name ?? "",
        glassType: p.glass_type ?? "",
        feature: p.feature ?? "",
        brand: p.brand ?? "",
        description: p.description ?? "",
        photos: [],
        status: p.status ?? "ativo",
        notes: p.notes ?? "",
        manufacturers: mfData
          .filter((mf: any) => mf.product_id === p.id)
          .map((mf: any) => ({
            id: mf.id,
            manufacturer: mf.manufacturer ?? "",
            cost: mf.cost ?? 0,
            price: mf.price ?? 0,
            lastPurchaseDate: mf.last_purchase_date ?? "",
            supplier: mf.supplier ?? "",
            inventories: [],
          })),
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
      }));
      setDbProducts(mapped);
    }
    load();
  }, []);

  const allProducts = dbProducts ?? mockProducts;

  // Quando os produtos carregam, seleciona o primeiro
  useEffect(() => {
    if (allProducts.length > 0 && !selectedProductId) {
      const first = allProducts[0];
      setSelectedProductId(first.id);
      setSelectedManufacturer(first.manufacturers[0]?.manufacturer ?? "");
      setCustomPrice(first.manufacturers[0]?.price ?? 0);
    }
  }, [allProducts]);

  const glassTypes = useMemo(() => {
    const types = Array.from(new Set(allProducts.map((p) => p.glassType).filter(Boolean))).sort();
    return types;
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (glassTypeFilter) list = list.filter((p) => p.glassType === glassTypeFilter);
    if (!searchTerm.trim()) return list;
    const term = normalize(searchTerm);
    return list.filter((p) => {
      const compat = p.compatibilities.map((c) => `${c.automaker} ${c.model} ${c.generation} ${c.version}`).join(" ");
      return normalize(`${p.internalCode} ${p.name} ${p.brand} ${p.glassType} ${p.feature} ${p.description} ${compat}`).includes(term);
    });
  }, [searchTerm, glassTypeFilter, allProducts]);

  // Quando o filtro muda e o produto selecionado sai da lista visível, seleciona o primeiro da nova lista
  useEffect(() => {
    if (filteredProducts.length === 0) return;
    const stillVisible = filteredProducts.some((p) => p.id === selectedProductId);
    if (!stillVisible) {
      const first = filteredProducts[0];
      setSelectedProductId(first.id);
      setSelectedManufacturer(first.manufacturers[0]?.manufacturer ?? "");
      setCustomPrice(first.manufacturers[0]?.price ?? 0);
    }
  }, [filteredProducts]);

  // Prioriza filteredProducts para que selectedProduct sempre corresponda
  // ao produto visível no dropdown (que exibe filteredProducts)
  const selectedProduct = useMemo(
    () =>
      filteredProducts.find((p) => p.id === selectedProductId) ??
      filteredProducts[0] ??
      allProducts[0],
    [selectedProductId, filteredProducts, allProducts]
  );

  const manufacturerData = useMemo(() => {
    if (!selectedProduct) return { cost: 0, price: 0, manufacturer: "" } as any;
    return (
      selectedProduct.manufacturers.find((m) => m.manufacturer === selectedManufacturer) ??
      selectedProduct.manufacturers[0] ?? { cost: 0, price: 0, manufacturer: "" }
    );
  }, [selectedProduct, selectedManufacturer]);

  // Combina tipo do produto + nome para melhorar a busca nos marketplaces
  const mlSearchQuery = useMemo(() => {
    const product = filteredProducts.find((p) => p.id === selectedProductId) ?? filteredProducts[0];
    if (!product) return "";
    const parts = [glassTypeFilter || product.glassType, product.name].filter(Boolean);
    return parts.join(" ");
  }, [filteredProducts, selectedProductId, glassTypeFilter]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value;
    setSearchTerm(term);
    if (!term.trim()) return;
    const t = normalize(term);
    // Respeita o filtro de tipo de vidro para que o produto selecionado
    // corresponda ao que está visível no dropdown
    let pool = allProducts;
    if (glassTypeFilter) pool = pool.filter((p) => p.glassType === glassTypeFilter);
    const match = pool.find((p) =>
      normalize(`${p.internalCode} ${p.name} ${p.brand} ${p.glassType} ${p.feature} ${p.description}`).includes(t)
    );
    if (match) {
      setSelectedProductId(match.id);
      setSelectedManufacturer(match.manufacturers[0]?.manufacturer ?? "");
      setCustomPrice(match.manufacturers[0]?.price ?? 0);
    }
  }

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    setSelectedProductId(id);
    setSelectedManufacturer(product.manufacturers[0]?.manufacturer ?? "");
    setCustomPrice(product.manufacturers[0]?.price ?? 0);
    setSearchTerm("");
  }

  function handleManufacturerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value;
    const mf = selectedProduct?.manufacturers.find((m) => m.manufacturer === name);
    setSelectedManufacturer(name);
    if (mf) setCustomPrice(mf.price);
  }

  if (!selectedProduct) return null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Seleção de Produto"
        description="Escolha o produto para comparar com os preços praticados online."
      >
        {/* Filtros: pesquisa por descrição + tipo de vidro */}
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <FormField label="Pesquisar por descrição">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Nome, código ou característica..."
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {(searchTerm || glassTypeFilter) && (
              <p className="mt-1 text-xs text-slate-500">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            )}
          </FormField>

          <FormField label="Tipo do produto">
            <Select
              value={glassTypeFilter}
              onChange={(e) => setGlassTypeFilter(e.target.value)}
              className="min-w-[180px]"
            >
              <option value="">Todos os tipos</option>
              {glassTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="Produto">
            <Select value={selectedProductId} onChange={handleProductChange}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              ) : (
                <option disabled value="">Nenhum produto encontrado</option>
              )}
            </Select>
          </FormField>

          <FormField label="Fabricante">
            <Select value={selectedManufacturer} onChange={handleManufacturerChange}>
              {selectedProduct.manufacturers.map((m) => (
                <option key={m.id} value={m.manufacturer}>
                  {m.manufacturer}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Preço Sugerido (Venda)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
              <Input
                type="number"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
                className="pl-10 font-bold text-primary"
              />
            </div>
          </FormField>
        </div>

        <div className="relative mt-6 rounded-3xl bg-slate-50 p-6">
          <button
            type="button"
            onClick={() => setShowValues((v) => !v)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
            title={showValues ? "Ocultar valores" : "Mostrar valores"}
          >
            {showValues ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Custo Interno</p>
              <p className="text-xl font-black text-slate-900">
                {showValues ? formatCurrency(manufacturerData.cost) : "••••••"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Margem Atual</p>
              <p className="text-xl font-black text-emerald-600">
                {showValues && customPrice > 0
                  ? `${(((customPrice - manufacturerData.cost) / customPrice) * 100).toFixed(1)}%`
                  : "••••••"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lucro Bruto</p>
              <p className="text-xl font-black text-slate-900">
                {showValues ? formatCurrency(customPrice - manufacturerData.cost) : "••••••"}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {glassTypeFilter ? (
        <MarketPriceComparison
          productId={selectedProductId}
          productName={selectedProduct.name}
          productBrand={selectedManufacturer}
          productImage={selectedProduct.photos[0]}
          salePrice={customPrice}
          costPrice={manufacturerData.cost}
          searchQuery={mlSearchQuery}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">
          <Search className="size-5 shrink-0 text-slate-400" />
          <p className="text-sm">
            Selecione um <span className="font-semibold text-slate-700">Tipo do produto</span> para ver a comparação de preços nos marketplaces.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-200 p-2 text-blue-700">
            <Calculator className="size-5" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900">Dica de Negociação</h4>
            <p className="mt-1 text-sm text-blue-700 leading-relaxed">
              Utilize os preços acima como argumento de venda. Se o preço do concorrente estiver menor, verifique se inclui instalação e garantia original,
              que são diferenciais da Auto Vitrais. Caso o preço esteja competitivo, reforce a disponibilidade imediata em estoque.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
