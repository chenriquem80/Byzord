import { useState, useMemo } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { products } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";
import { MarketPriceComparison } from "@/components/shared/market-price-comparison";
import { Search, Calculator } from "lucide-react";

export function QuotesPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0].id);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(
    products[0].manufacturers[0].manufacturer
  );
  const [customPrice, setCustomPrice] = useState<number>(products[0].manufacturers[0].price);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [selectedProductId]
  );

  const manufacturerData = useMemo(
    () => selectedProduct.manufacturers.find((m) => m.manufacturer === selectedManufacturer) || selectedProduct.manufacturers[0],
    [selectedProduct, selectedManufacturer]
  );

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const product = products.find((p) => p.id === id) || products[0];
    setSelectedProductId(id);
    setSelectedManufacturer(product.manufacturers[0].manufacturer);
    setCustomPrice(product.manufacturers[0].price);
  };

  const handleManufacturerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    const manufacturer = selectedProduct.manufacturers.find((m) => m.manufacturer === name);
    setSelectedManufacturer(name);
    if (manufacturer) setCustomPrice(manufacturer.price);
  };

  return (
    <div className="space-y-6">
            <SectionCard
        title="Seleção de Produto"
        description="Escolha o produto para comparar com os preços praticados online."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="Produto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Select 
                value={selectedProductId} 
                onChange={handleProductChange}
                className="pl-10"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.internalCode} • {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </FormField>

          <FormField label="Fabricante">
            <Select 
              value={selectedManufacturer} 
              onChange={handleManufacturerChange}
            >
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

        <div className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-6 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Custo Interno</p>
            <p className="text-xl font-black text-slate-900">{formatCurrency(manufacturerData.cost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Margem Atual</p>
            <p className="text-xl font-black text-emerald-600">
              {(( (customPrice - manufacturerData.cost) / customPrice ) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lucro Bruto</p>
            <p className="text-xl font-black text-slate-900">{formatCurrency(customPrice - manufacturerData.cost)}</p>
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

