import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LabelCard } from "@/components/shared/label-card";
import { products as mockProducts } from "@/data/mock-data";
import { formatMonthYear } from "@/lib/format";
import { supabase } from "@/lib/database";
import type { Product } from "@/types/domain";

type Manufacturer = Product["manufacturers"][0];

export function LabelsPage() {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>(mockProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      const [productsResp, mfResp, invResp, compatResp] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("product_manufacturers").select("*"),
        supabase.from("product_store_inventory").select("*"),
        supabase.from("product_vehicle_compatibility").select("*, vehicles(*)"),
      ]);
      const rawProducts = productsResp.data ?? [];
      const rawMf = mfResp.data ?? [];
      const rawInv = invResp.data ?? [];
      const rawCompat = compatResp.data ?? [];

      if (rawProducts.length === 0) return;

      const mapped: Product[] = rawProducts.map((p: any) => {
        const mfs = rawMf.filter((mf: any) => mf.product_id === p.id);
        const manufacturers: Manufacturer[] = mfs.map((mf: any) => ({
          id: mf.id,
          manufacturer: mf.manufacturer ?? "",
          cost: mf.cost ?? mf.current_cost ?? 0,
          price: mf.price ?? mf.sale_price ?? 0,
          lastPurchaseDate: mf.last_purchase_date ?? "",
          supplier: mf.supplier ?? "",
          inventories: rawInv
            .filter((inv: any) => inv.manufacturer_id === mf.id)
            .map((inv: any) => ({
              id: inv.id,
              storeId: inv.store_id,
              storeName: "",
              location: inv.location ?? "",
              stock: inv.stock ?? 0,
              minQuantity: inv.min_quantity ?? 0,
              lado: inv.lado ?? null,
            })),
        }));
        return {
          id: p.id,
          supplierCode: "",
          barcode: p.barcode ?? "",
          name: p.name ?? "",
          glassType: p.glass_type ?? "",
          feature: p.feature ?? "",
          lado: p.lado ?? null,
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
      setAllProducts(mapped);
    }
    fetchData();
  }, []);

  const searchResults = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return allProducts.filter((p) => {
      const compat = p.compatibilities
        .map((c) => `${c.automaker} ${c.model} ${c.generation} ${c.version}`)
        .join(" ");
      const text = `${p.name} ${p.glassType} ${p.feature} ${p.brand} ${p.barcode} ${compat}`.toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [query, allProducts]);

  function buildLabels(product: Product) {
    const compat = product.compatibilities[0];
    const vehicleLabel = compat
      ? `${compat.automaker} ${compat.model}`.trim()
      : product.name;
    const yearRange = compat ? `${compat.startYear}/${compat.endYear}` : "";

    return product.manufacturers.map((mf) => {
      const invLado = mf.inventories[0] ? (mf.inventories[0] as any).lado ?? product.lado ?? null : product.lado ?? null;
      const dateLabel = mf.lastPurchaseDate
        ? formatMonthYear(mf.lastPurchaseDate)
        : "";
      return {
        key: mf.id,
        productCode: product.barcode || product.name,
        vehicleLabel,
        yearRange,
        feature: product.feature,
        lado: invLado,
        glassType: product.glassType,
        manufacturer: mf.manufacturer,
        purchaseSummary: dateLabel ? `${mf.cost} - ${dateLabel}` : "",
      };
    });
  }

  const labelCards = selectedProduct ? buildLabels(selectedProduct) : [];

  return (
    <div className="space-y-6">
      {/* Busca */}
      <SectionCard
        title="Buscar produto"
        description="Digite o nome, tipo, marca ou código para encontrar o produto e gerar a etiqueta."
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedProduct(null);
            }}
            placeholder="Ex: Parabrisa Gol, Celta porta, 7891000000014..."
            className="pl-10"
          />
        </div>

        {query.trim() && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {searchResults.length} produto{searchResults.length !== 1 ? "s" : ""} encontrado{searchResults.length !== 1 ? "s" : ""}
              {searchResults.length > 0 ? " — clique para gerar etiqueta" : ""}
            </p>
            {searchResults.length > 0 && (
              <div className="divide-y divide-border">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(product);
                      setQuery(product.name);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        {product.glassType} • {product.feature} • {product.brand}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 text-xs font-mono text-slate-400">
                      {product.barcode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Etiquetas do produto selecionado */}
      {selectedProduct && labelCards.length > 0 && (
        <SectionCard
          title="Pré-visualização"
          description={`${selectedProduct.name} — ${labelCards.length} etiqueta${labelCards.length !== 1 ? "s" : ""} (uma por fabricante)`}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {labelCards.map((lbl) => (
              <Card key={lbl.key} className="border-dashed bg-slate-100">
                <CardContent className="flex flex-col items-center gap-3 p-5">
                  <LabelCard label={lbl} />
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Estado vazio */}
      {!selectedProduct && !query.trim() && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50 py-16 text-center">
          <Search className="size-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Pesquise um produto acima para gerar a etiqueta
          </p>
        </div>
      )}
    </div>
  );
}
