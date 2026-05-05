import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import { products, stores } from "@/data/mock-data";
import type { Product } from "@/types/domain";

interface StockRow {
  product: Product;
  characteristic: string;
  store1Quantity: number;
  store2Quantity: number;
  totalQuantity: number;
  productName: string;
  code: string;
  manufacturer: string;
  cost: number;
  price: number;
  lastPurchaseDate: string;
}

export function StockPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [glassType, setGlassType] = useState("");
  const [feature, setFeature] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const rows = useMemo<StockRow[]>(() => {
    return products
      .filter((product) => {
        const text = `${product.name} ${product.brand} ${product.compatibilities
          .map((item) => `${item.model} ${item.generation}`)
          .join(" ")}`.toLowerCase();
        const matchesQuery = query ? text.includes(query.toLowerCase()) : true;
        const matchesYear = year
          ? product.compatibilities.some(
              (item) => Number(year) >= item.startYear && Number(year) <= item.endYear,
            )
          : true;
        const matchesModel = modelFilter
          ? product.compatibilities.some((item) => item.model === modelFilter)
          : true;
        const matchesGlassType = glassType ? product.glassType === glassType : true;
        const matchesFeature = feature ? product.feature === feature : true;
        return matchesQuery && matchesYear && matchesModel && matchesGlassType && matchesFeature;
      })
      .flatMap((product) => {
        return product.manufacturers.map((manufacturer) => {
          const store1Quantity =
            manufacturer.inventories.find((inventory) => inventory.storeId === stores[0].id)?.stock ?? 0;
          const store2Quantity =
            manufacturer.inventories.find((inventory) => inventory.storeId === stores[1].id)?.stock ?? 0;

          return {
            product,
            characteristic: product.feature,
            store1Quantity,
            store2Quantity,
            totalQuantity: store1Quantity + store2Quantity,
            productName: product.name,
            code: product.internalCode,
            manufacturer: manufacturer.manufacturer,
            cost: manufacturer.cost,
            price: manufacturer.price,
            lastPurchaseDate: manufacturer.lastPurchaseDate,
          };
        });
      });
  }, [feature, glassType, modelFilter, query, year]);

  const columns = useMemo<ColumnDef<StockRow>[]>(
    () => [
      {
        accessorKey: "characteristic",
        header: "Característica",
        cell: ({ row }) => (
          <button
            className="font-semibold text-primary underline-offset-4 hover:underline"
            onClick={() => setSelectedProduct(row.original.product)}
          >
            {row.original.characteristic}
          </button>
        ),
      },
      { accessorKey: "store1Quantity", header: stores[0].code },
      { accessorKey: "store2Quantity", header: stores[1].code },
      { accessorKey: "totalQuantity", header: "Total" },
      { accessorKey: "productName", header: "Produto" },
      { accessorKey: "code", header: "Código" },
      { accessorKey: "manufacturer", header: "Fabricante" },
      {
        accessorKey: "price",
        header: "Preço venda",
        cell: ({ row }) => formatCurrency(row.original.price),
      },
      {
        accessorKey: "lastPurchaseDate",
        header: "Última compra",
        cell: ({ row }) => formatMonthYear(row.original.lastPurchaseDate),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/app/produtos?id=${row.original.product.id}`)}
          >
            <Pencil className="size-3" />
            Alterar
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
            <SectionCard
        title="Busca de Produto"
        description="Filtre por nome, código ou ano para consultar o estoque em todas as lojas."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Digite o nome do produto (ex: Parabrisa Gol)" 
            />
          </div>
          <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Ano" />
          <Select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} placeholder="Modelo">
            {[...new Set(products.flatMap((item) => item.compatibilities.map((compatibility) => compatibility.model)))].map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </Select>
          <Select value={glassType} onChange={(e) => setGlassType(e.target.value)} placeholder="Tipo de vidro">
            {[...new Set(products.map((item) => item.glassType))].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={feature} onChange={(e) => setFeature(e.target.value)} placeholder="Característica">
            {[...new Set(products.map((item) => item.feature))].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </SectionCard>

      <SectionCard
        title="Resultado"
        description="Clique na característica para abrir o detalhamento por loja e fabricante."
        action={<Badge className="bg-rose-100 text-rose-700">{rows.filter((item) => item.totalQuantity === 0).length} zerados</Badge>}
      >
        <DataTable columns={columns} data={rows} />
      </SectionCard>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        {selectedProduct ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Produto selecionado: {selectedProduct.internalCode}</DialogTitle>
              <DialogDescription>
                {selectedProduct.name} • {selectedProduct.feature} • consulta das duas lojas
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Loja</th>
                    <th className="px-4 py-3 text-left">Fabricante</th>
                    <th className="px-4 py-3 text-left">Estoque</th>
                    <th className="px-4 py-3 text-left">Custo</th>
                    <th className="px-4 py-3 text-left">Venda</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Localização</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.manufacturers.flatMap((item) =>
                    item.inventories.map((inventory) => (
                      <tr key={`${item.id}-${inventory.id}`} className="border-t border-border">
                        <td className="px-4 py-3">{inventory.storeName}</td>
                        <td className="px-4 py-3">{item.manufacturer}</td>
                        <td className="px-4 py-3">{inventory.stock}</td>
                        <td className="px-4 py-3">{formatCurrency(item.cost)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3">{formatMonthYear(item.lastPurchaseDate)}</td>
                        <td className="px-4 py-3">{inventory.location}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Descrição</p>
                <p className="mt-2 font-medium text-slate-900">{selectedProduct.description}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Compatibilidade</p>
                <p className="mt-2 font-medium text-slate-900">
                  {selectedProduct.compatibilities
                    .map((item) => `${item.model} ${item.generation} ${item.startYear}/${item.endYear}`)
                    .join(" • ")}
                </p>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

