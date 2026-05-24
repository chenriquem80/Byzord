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
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [showValues, setShowValues] = useState(false);

  // Carrega produtos do Supabase
  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [{ data: pData }, { data: mfData }] = await Promise.all([
        supabase.from("products").select("*").eq("status", "ativo"),
        supabase.from("product_manufacturers").select("*"),
      ]);
      if (!pData || !mfData) return;
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
        compatibilities: [],
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

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allProducts;
    const term = normalize(searchTerm);
    return allProducts.filter((p) =>
      normalize(`${p.internalCode} ${p.name} ${p.brand} ${p.glassType} ${p.feature} ${p.description}`).includes(term)
    );
  }, [searchTerm, allProducts]);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) ?? allProducts[0],
    [selectedProductId, allProducts]
  );

  const manufacturerData = useMemo(() => {
    if (!selectedProduct) return { cost: 0, price: 0, manufacturer: "" } as any;
    return (
      selectedProduct.manufacturers.find((m) => m.manufacturer === selectedManufacturer) ??
      selectedProduct.manufacturers[0] ?? { cost: 0, price: 0, manufacturer: "" }
    );
  }, [selectedProduct, selectedManufacturer]);

  // Termo usado na API do ML: searchTerm se preenchido, senão nome do produto
  const mlSearchQuery = searchTerm.trim() || selectedProduct?.name || "";

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value;
    setSearchTerm(term);
    if (!term.trim()) return;
    const t = normalize(term);
    const match = allProducts.find((p) =>
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
        {/* Campo de pesquisa por descrição */}
        <div className="mb-4">
          <FormField label="Pesquisar por descrição">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Digite o nome, código ou característica do produto..."
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
            {searchTerm && (
              <p className="mt-1 text-xs text-slate-500">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
              </p>
            )}
          </FormField>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="Produto">
            <Select value={selectedProductId} onChange={handleProductChange}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.internalCode ? `${p.internalCode} • ` : ""}{p.name}
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

      <MarketPriceComparison
        productId={selectedProductId}
        productName={selectedProduct.name}
        productBrand={selectedManufacturer}
        productImage={selectedProduct.photos[0]}
        salePrice={customPrice}
        costPrice={manufacturerData.cost}
        searchQuery={mlSearchQuery}
      />

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
