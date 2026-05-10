import { useEffect, useMemo, useState } from "react";
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
import { products as mockProducts, stores as mockStores } from "@/data/mock-data";
import { supabase } from "@/lib/database";
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
  const [glassType, setGlassType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);
  const [dbStores, setDbStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) { setLoading(false); return; }

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

      setDbStores(stores);

      if (rawProducts.length === 0 || rawMf.length === 0) {
        setDbProducts(null);
        setLoading(false);
        return;
      }

      const mapped: Product[] = rawProducts.map((p: any) => {
        const mfs = rawMf.filter((mf: any) => mf.product_id === p.id);
        const manufacturers = mfs.map((mf: any) => {
          const mfId = mf.id;
          const invs = rawInv.filter(
            (inv: any) => inv.manufacturer_id === mfId || inv.product_manufacturer_id === mfId
          );
          const store = stores.find((s: any) => s.id === mf.store_id);
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
                storeName: invStore?.name ?? store?.name ?? "",
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

      setDbProducts(mapped);
      setLoading(false);
    }
    fetchData();
  }, []);

  const stores = dbStores.length > 0 ? dbStores : mockStores;
  // Mostra dados do banco se disponíveis; caso contrário, usa mock
  const products = dbProducts ?? mockProducts;

  const rows = useMemo<StockRow[]>(() => {
    const seen = new Set<string>();
    return products
      .filter((product) => {
        const text = `${product.internalCode} ${product.name} ${product.brand} ${product.glassType} ${product.feature} ${product.compatibilities
          .map((item) => `${item.model} ${item.generation}`)
          .join(" ")}`.toLowerCase();
        const matchesQuery = query
          ? query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => text.includes(term))
          : true;
        const matchesGlassType = glassType ? product.glassType === glassType : true;
        return matchesQuery && matchesGlassType;
      })
      .flatMap((product) => {
        if (product.manufacturers.length === 0) return [];
        return product.manufacturers.map((manufacturer) => {
          const store1Quantity =
            manufacturer.inventories.find((inventory) => inventory.storeId === stores[0]?.id)?.stock ?? 0;
          const store2Quantity =
            manufacturer.inventories.find((inventory) => inventory.storeId === stores[1]?.id)?.stock ?? 0;

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
      })
      .filter((row) => {
        const key = `${row.product.id}-${row.manufacturer}-${row.cost}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [glassType, query, products, stores]);

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
      { accessorKey: "store1Quantity", header: stores[0]?.code ?? "Loja 1" },
      { accessorKey: "store2Quantity", header: stores[1]?.code ?? "Loja 2" },
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
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome do produto (ex: Parabrisa Gol)"
          />
          <Select value={glassType} onChange={(e) => setGlassType(e.target.value)} placeholder="Todos os itens">
            {[...new Set(products.map((item) => item.glassType))].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
        </div>
      </SectionCard>

      <SectionCard
        title="Resultado"
        description="Clique na característica para abrir o detalhamento por loja e fabricante."
        action={<Badge className="bg-rose-100 text-rose-700">{rows.filter((item) => item.totalQuantity === 0).length} zerados</Badge>}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando estoque...</p>
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
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

