import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { products, stores, suppliers } from "@/data/mock-data";
import { formatCurrency, formatMonthYear, formatPercentage } from "@/lib/format";
import { productSchema } from "@/lib/schemas";
import type { Product } from "@/types/domain";

type ProductFormValues = {
  internalCode: string;
  supplierCode: string;
  barcode: string;
  name: string;
  glassType: string;
  feature: string;
  manufacturer: string;
  brand: string;
  description: string;
  location: string;
  quantity: number;
  minimum: number;
  cost: number;
  price: number;
  lastPurchaseDate: string;
  lastSupplier: string;
  status: "ativo" | "inativo";
  notes?: string;
};

export function ProductsPage() {
  const firstProduct = products[0];
  const firstInventory = firstProduct.manufacturers[0].inventories[0];
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      internalCode: firstProduct.internalCode,
      supplierCode: firstProduct.supplierCode,
      barcode: firstProduct.barcode,
      name: firstProduct.name,
      glassType: firstProduct.glassType,
      feature: firstProduct.feature,
      manufacturer: firstProduct.manufacturers[0].manufacturer,
      brand: firstProduct.brand,
      description: firstProduct.description,
      location: firstInventory.location,
      quantity: firstProduct.manufacturers.reduce(
        (sum, item) => sum + item.inventories.reduce((storeSum, inventory) => storeSum + inventory.stock, 0),
        0,
      ),
      minimum: firstInventory.minQuantity,
      cost: firstProduct.manufacturers[0].cost,
      price: firstProduct.manufacturers[0].price,
      lastPurchaseDate: firstProduct.manufacturers[0].lastPurchaseDate,
      lastSupplier: firstProduct.manufacturers[0].supplier,
      status: firstProduct.status,
      notes: firstProduct.notes,
    },
  });

  const watchedCost = form.watch("cost");
  const watchedPrice = form.watch("price");
  const margin = watchedCost ? ((watchedPrice - watchedCost) / watchedCost) * 100 : 0;

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "internalCode", header: "Código" },
      { accessorKey: "name", header: "Produto" },
      { accessorKey: "glassType", header: "Tipo" },
      { accessorKey: "feature", header: "Característica" },
      {
        id: "stock",
        header: "Total",
        cell: ({ row }) =>
          row.original.manufacturers.reduce(
            (sum, item) => sum + item.inventories.reduce((storeSum, inventory) => storeSum + inventory.stock, 0),
            0,
          ),
      },
      {
        id: "store1",
        header: stores[0].code,
        cell: ({ row }) =>
          row.original.manufacturers.reduce(
            (sum, item) =>
              sum + (item.inventories.find((inventory) => inventory.storeId === stores[0].id)?.stock ?? 0),
            0,
          ),
      },
      {
        id: "store2",
        header: stores[1].code,
        cell: ({ row }) =>
          row.original.manufacturers.reduce(
            (sum, item) =>
              sum + (item.inventories.find((inventory) => inventory.storeId === stores[1].id)?.stock ?? 0),
            0,
          ),
      },
      {
        id: "cost",
        header: "Custo",
        cell: ({ row }) => formatCurrency(row.original.manufacturers[0].cost),
      },
      {
        id: "price",
        header: "Venda",
        cell: ({ row }) => formatCurrency(row.original.manufacturers[0].price),
      },
      {
        id: "lastPurchase",
        header: "Últ. compra",
        cell: ({ row }) => formatMonthYear(row.original.manufacturers[0].lastPurchaseDate),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
            <SectionCard
        title="Cadastro"
        description="Estrutura pronta para conexão com Supabase/PostgreSQL e histórico por fabricante."
        action={<Button size="lg">Salvar produto</Button>}
      >
        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados do produto</TabsTrigger>
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
            <TabsTrigger value="preco">Preço</TabsTrigger>
            <TabsTrigger value="compatibilidade">Veículos compatíveis</TabsTrigger>
            <TabsTrigger value="compras">Histórico de compras</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="observacoes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Código interno" error={form.formState.errors.internalCode?.message}>
                <Input {...form.register("internalCode")} />
              </FormField>
              <FormField label="Código fornecedor" error={form.formState.errors.supplierCode?.message}>
                <Input {...form.register("supplierCode")} />
              </FormField>
              <FormField label="Código de barras" error={form.formState.errors.barcode?.message}>
                <Input {...form.register("barcode")} />
              </FormField>
              <FormField label="Nome do produto" error={form.formState.errors.name?.message} className="xl:col-span-2">
                <Input {...form.register("name")} />
              </FormField>
              <FormField label="Tipo de vidro" error={form.formState.errors.glassType?.message}>
                <Select {...form.register("glassType")}>
                  {["Parabrisa", "Vigia", "Porta dianteira", "Porta traseira", "Lateral fixa", "Quebra-vento", "Teto solar"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Característica" error={form.formState.errors.feature?.message}>
                <Select {...form.register("feature")}>
                  {["Verde", "Verde sensor", "Degradê", "Degradê sensor", "Incolor", "Térmico"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Fabricante" error={form.formState.errors.manufacturer?.message}>
                <Select {...form.register("manufacturer")}>
                  {["AGC", "Pilkington", "Saint-Gobain", "Fanavid", "XYG", "Outro"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Marca" error={form.formState.errors.brand?.message}>
                <Input {...form.register("brand")} />
              </FormField>
              <FormField label="Descrição" error={form.formState.errors.description?.message} className="md:col-span-2 xl:col-span-4">
                <Textarea {...form.register("description")} />
              </FormField>
            </form>
          </TabsContent>

          <TabsContent value="estoque">
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              {stores.map((store) => {
                const inventories = firstProduct.manufacturers.flatMap((manufacturer) =>
                  manufacturer.inventories.filter((inventory) => inventory.storeId === store.id),
                );
                const storeStock = inventories.reduce((sum, inventory) => sum + inventory.stock, 0);
                const minimum = inventories.reduce((sum, inventory) => sum + inventory.minQuantity, 0);

                return (
                  <div key={store.id} className="rounded-2xl border border-border bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{store.name}</p>
                    <p className="mt-2 text-sm text-slate-600">Saldo atual: {storeStock} un.</p>
                    <p className="text-sm text-slate-600">Mínimo sugerido: {minimum} un.</p>
                    <p className="text-sm text-slate-600">
                      Localizações: {inventories.map((inventory) => inventory.location).join(" • ")}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Localização" error={form.formState.errors.location?.message}>
                <Input {...form.register("location")} />
              </FormField>
              <FormField label="Quantidade atual" error={form.formState.errors.quantity?.message}>
                <Input type="number" {...form.register("quantity")} />
              </FormField>
              <FormField label="Quantidade mínima" error={form.formState.errors.minimum?.message}>
                <Input type="number" {...form.register("minimum")} />
              </FormField>
              <FormField label="Status" error={form.formState.errors.status?.message}>
                <Select {...form.register("status")}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>
              </FormField>
            </div>
          </TabsContent>

          <TabsContent value="preco">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormField label="Preço de custo" error={form.formState.errors.cost?.message}>
                <Input type="number" step="0.01" {...form.register("cost")} />
              </FormField>
              <FormField label="Preço de venda" error={form.formState.errors.price?.message}>
                <Input type="number" step="0.01" {...form.register("price")} />
              </FormField>
              <FormField label="Margem automática">
                <Input value={formatPercentage(margin)} disabled />
              </FormField>
              <FormField label="Última data de compra" error={form.formState.errors.lastPurchaseDate?.message}>
                <Input type="date" {...form.register("lastPurchaseDate")} />
              </FormField>
              <FormField label="Último fornecedor" error={form.formState.errors.lastSupplier?.message}>
                <Select {...form.register("lastSupplier")}>
                  {suppliers.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </TabsContent>

          <TabsContent value="compatibilidade">
            <div className="space-y-3">
              {firstProduct.compatibilities.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    {item.automaker} {item.model} {item.generation}
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.startYear} a {item.endYear} • {item.version}
                  </p>
                  {item.note ? <p className="mt-2 text-sm text-slate-500">{item.note}</p> : null}
                </div>
              ))}
              <Button variant="outline">Adicionar compatibilidade</Button>
            </div>
          </TabsContent>

          <TabsContent value="compras">
            <div className="space-y-3">
              {firstProduct.manufacturers.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-5">
                  <p className="font-semibold text-slate-900">{item.manufacturer}</p>
                  <p className="text-slate-600">
                    {item.inventories.reduce((sum, inventory) => sum + inventory.stock, 0)} un.
                  </p>
                  <p className="text-slate-600">{formatCurrency(item.cost)}</p>
                  <p className="text-slate-600">{formatCurrency(item.price)}</p>
                  <p className="text-slate-600">{formatMonthYear(item.lastPurchaseDate)}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="movimentacoes">
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Estrutura pronta para puxar entradas, saídas, ajustes, perdas e devoluções por produto.
            </p>
          </TabsContent>

          <TabsContent value="fotos">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {firstProduct.photos.map((photo) => (
                <div key={photo} className="rounded-3xl border border-dashed border-border bg-slate-50 p-10 text-center text-sm text-slate-500">
                  Foto do produto
                </div>
              ))}
              <Button variant="outline" className="h-full min-h-40 border-dashed">
                Adicionar foto
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="observacoes">
            <FormField label="Observações">
              <Textarea {...form.register("notes")} />
            </FormField>
          </TabsContent>
        </Tabs>
      </SectionCard>

      <SectionCard title="Lista de produtos" description="Visão resumida para conferência e manutenção.">
        <DataTable columns={columns} data={products} />
      </SectionCard>
    </div>
  );
}

