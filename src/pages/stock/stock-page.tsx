import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Car, Check, Pencil, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import { products as mockProducts, stores as mockStores } from "@/data/mock-data";
import { supabase } from "@/lib/database";
import type { Product } from "@/types/domain";


function CompatPopup({ compatibilities }: { compatibilities: Product["compatibilities"] }) {
  const [open, setOpen] = useState(false);
  if (compatibilities.length === 0) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-primary hover:text-primary"
      >
        <Car className="size-3.5" />
        {compatibilities.length} veículo{compatibilities.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Veículos compatíveis</p>
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {compatibilities.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                <span className="font-medium">{c.automaker} {c.model}</span>
                {c.generation ? ` · ${c.generation}` : ""}
                {(c.startYear || c.endYear) ? ` · ${c.startYear}/${c.endYear}` : ""}
                {c.version ? ` · ${c.version}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface StockRow {
  product: Product;
  manufacturerId: string;
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

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  row: StockRow | null;
}

export function StockPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [glassType, setGlassType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);
  const [dbStores, setDbStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Context menu (botão direito)
  const [ctxMenu, setCtxMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, row: null });
  const ctxRef = useRef<HTMLDivElement>(null);

  // Dialog de edição rápida
  const [editDialog, setEditDialog] = useState<{ open: boolean; productId: string; name: string; saving: boolean }>({
    open: false, productId: "", name: "", saving: false,
  });

  // Fecha o menu de contexto ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu((m) => ({ ...m, visible: false }));
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleContextMenu(e: React.MouseEvent, row: StockRow) {
    e.preventDefault();
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, row });
  }

  function openEditDialog() {
    if (!ctxMenu.row) return;
    setEditDialog({ open: true, productId: ctxMenu.row.product.id, name: ctxMenu.row.product.name, saving: false });
    setCtxMenu((m) => ({ ...m, visible: false }));
  }

  async function handleSaveName() {
    if (!editDialog.productId || !editDialog.name.trim()) return;
    setEditDialog((d) => ({ ...d, saving: true }));
    if (supabase) {
      await supabase.from("products").update({ name: editDialog.name.trim() }).eq("id", editDialog.productId);
    }
    setEditDialog((d) => ({ ...d, open: false, saving: false }));
    fetchData();
  }

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);

    const [storesResp, productsResp, mfResp, invResp, compatResp] = await Promise.all([
      supabase.from("stores").select("*"),
      supabase.from("products").select("*"),
      supabase.from("product_manufacturers").select("*"),
      supabase.from("product_store_inventory").select("*"),
      supabase.from("product_vehicle_compatibility").select("*, vehicles(*)"),
    ]);

    const stores = storesResp.data ?? [];
    const rawProducts = productsResp.data ?? [];
    const rawMf = mfResp.data ?? [];
    const rawInv = invResp.data ?? [];
    const rawCompat = compatResp.data ?? [];

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
          (inv: any) => inv.manufacturer_id === mfId
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

    setDbProducts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stores = dbStores.length > 0 ? dbStores : mockStores;
  // Mostra dados do banco se disponíveis; caso contrário, usa mock
  const products = dbProducts ?? mockProducts;

  const rows = useMemo<StockRow[]>(() => {
    const seen = new Set<string>();
    return products
      .filter((product) => {
        const text = `${product.internalCode} ${product.name} ${product.brand} ${product.glassType} ${product.feature} ${product.compatibilities
          .map((item) => `${item.automaker} ${item.model} ${item.generation} ${item.version}`)
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
            manufacturerId: manufacturer.id,
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
        header: () => <span className="block text-center">Característica</span>,
        cell: ({ row }) => (
          <div className="text-center">
            <button
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => setSelectedProduct(row.original.product)}
            >
              {row.original.characteristic}
            </button>
          </div>
        ),
      },
      { accessorKey: "store1Quantity", header: stores[0]?.code ?? "Loja 1" },
      { accessorKey: "store2Quantity", header: stores[1]?.code ?? "Loja 2" },
      { accessorKey: "totalQuantity", header: "Total" },
      {
        accessorKey: "productName",
        header: "Produto",
        cell: ({ row }) => (
          <span
            onContextMenu={(e) => handleContextMenu(e, row.original)}
            className="cursor-context-menu select-none"
          >
            <button
              type="button"
              className="text-left underline-offset-2 hover:underline hover:text-primary"
              onClick={() => navigate(`/app/produtos?id=${row.original.product.id}&mf=${row.original.manufacturerId}&view=1`)}
            >
              {row.original.productName}
            </button>
          </span>
        ),
      },
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
        id: "compat",
        header: "Compatíveis",
        cell: ({ row }) => <CompatPopup compatibilities={row.original.product.compatibilities} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/app/produtos?id=${row.original.product.id}&mf=${row.original.manufacturerId}`)}
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
        action={
          <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando estoque...</p>
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </SectionCard>

      {/* Menu de contexto (botão direito) */}
      {ctxMenu.visible && ctxMenu.row && (
        <div
          ref={ctxRef}
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          className="fixed z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          <p className="truncate px-3 py-1.5 text-xs font-semibold text-slate-400">{ctxMenu.row.productName}</p>
          <hr className="my-1 border-slate-100" />
          <button
            onClick={openEditDialog}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="size-3.5 text-primary" />
            Editar descrição
          </button>
          <button
            onClick={() => { navigate(`/app/produtos?id=${ctxMenu.row!.product.id}&mf=${ctxMenu.row!.manufacturerId}`); setCtxMenu((m) => ({ ...m, visible: false })); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="size-3.5 text-slate-500" />
            Editar produto completo
          </button>
        </div>
      )}

      {/* Dialog de edição rápida de nome */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog((d) => ({ ...d, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar descrição do produto</DialogTitle>
            <DialogDescription>Altere o nome/descrição e clique em Salvar.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              value={editDialog.name}
              onChange={(e) => setEditDialog((d) => ({ ...d, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditDialog((d) => ({ ...d, open: false })); }}
              placeholder="Nome do produto"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialog((d) => ({ ...d, open: false }))}>
                <X className="size-3.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveName} disabled={editDialog.saving || !editDialog.name.trim()}>
                <Check className="size-3.5" /> {editDialog.saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    <th className="px-4 py-3 text-left">Estoque</th>
                    <th className="px-4 py-3 text-left">Custo</th>
                    <th className="px-4 py-3 text-left">Venda</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Localização</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.manufacturers.map((mf) => (
                    <>
                      <tr key={`mf-${mf.id}`}>
                        <td
                          colSpan={6}
                          className="border-t border-border bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600"
                        >
                          {mf.manufacturer || "—"} &nbsp;•&nbsp; Total:{" "}
                          {mf.inventories.reduce((s, i) => s + i.stock, 0)} un.
                          &nbsp;•&nbsp; Última compra: {formatMonthYear(mf.lastPurchaseDate)}
                        </td>
                      </tr>
                      {mf.inventories.map((inventory) => (
                        <tr key={`${mf.id}-${inventory.id}`} className="border-t border-border">
                          <td className="px-4 py-3">{inventory.storeName}</td>
                          <td className="px-4 py-3">{inventory.stock}</td>
                          <td className="px-4 py-3">{formatCurrency(mf.cost)}</td>
                          <td className="px-4 py-3">{formatCurrency(mf.price)}</td>
                          <td className="px-4 py-3">{formatMonthYear(mf.lastPurchaseDate)}</td>
                          <td className="px-4 py-3">{inventory.location}</td>
                        </tr>
                      ))}
                    </>
                  ))}
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

