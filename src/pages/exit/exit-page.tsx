import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { currentUser, customers, products, stores } from "@/data/mock-data";
import { formatCurrency } from "@/lib/format";
import { saleSchema } from "@/lib/schemas";

type SaleFormValues = {
  storeId: string;
  productId: string;
  manufacturer: string;
  customer: string;
  customerVehicle: string;
  plate: string;
  paymentMethod: string;
  quantity: number;
  price: number;
  discount: number;
  note?: string;
};

export function ExitPage() {
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      storeId: stores[0].id,
      productId: products[0].id,
      manufacturer: products[0].manufacturers[1].manufacturer,
      customer: customers[0].name,
      customerVehicle: customers[0].vehicleModel,
      plate: customers[0].plate,
      paymentMethod: "Cartão",
      quantity: 1,
      price: products[0].manufacturers[1].price,
      discount: 0,
      note: "",
    },
  });

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.watch("productId")) ?? products[0],
    [form],
  );

  const manufacturerStock = useMemo(
    () => selectedProduct.manufacturers.find((item) => item.manufacturer === form.watch("manufacturer")),
    [form, selectedProduct.manufacturers],
  );

  const selectedInventory = useMemo(
    () => manufacturerStock?.inventories.find((inventory) => inventory.storeId === form.watch("storeId")),
    [form, manufacturerStock],
  );

  return (
    <div className="space-y-6">
            <SectionCard
        title="Registrar venda"
        description="O fluxo está preparado para baixar estoque, registrar venda e gerar movimentação com log."
        action={
          selectedInventory && selectedInventory.stock > 0 ? (
            <Badge className="bg-emerald-100 text-emerald-700">
              Estoque na loja: {selectedInventory.stock}
            </Badge>
          ) : (
            <Badge className="bg-rose-100 text-rose-700">Venda bloqueada sem estoque</Badge>
          )
        }
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Loja" error={form.formState.errors.storeId?.message}>
            <Select {...form.register("storeId")}>
              {stores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Produto" error={form.formState.errors.productId?.message}>
            <Select {...form.register("productId")}>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.internalCode} • {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fabricante" error={form.formState.errors.manufacturer?.message}>
            <Select {...form.register("manufacturer")}>
              {selectedProduct.manufacturers.map((item) => (
                <option key={item.id} value={item.manufacturer}>
                  {item.manufacturer}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Cliente" error={form.formState.errors.customer?.message}>
            <Select {...form.register("customer")}>
              {customers.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Veículo do cliente" error={form.formState.errors.customerVehicle?.message}>
            <Input {...form.register("customerVehicle")} />
          </FormField>
          <FormField label="Placa" error={form.formState.errors.plate?.message}>
            <Input {...form.register("plate")} />
          </FormField>
          <FormField label="Forma de pagamento" error={form.formState.errors.paymentMethod?.message}>
            <Select {...form.register("paymentMethod")}>
              {["Dinheiro", "Pix", "Cartão", "Boleto"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quantidade" error={form.formState.errors.quantity?.message}>
            <Input type="number" {...form.register("quantity")} />
          </FormField>
          <FormField label="Preço de venda" error={form.formState.errors.price?.message}>
            <Input type="number" step="0.01" {...form.register("price")} />
          </FormField>
          <FormField label="Desconto" error={form.formState.errors.discount?.message}>
            <Input type="number" step="0.01" {...form.register("discount")} />
          </FormField>
          {currentUser.allowCostView && manufacturerStock ? (
            <FormField label="Custo visível para este perfil">
              <Input disabled value={formatCurrency(manufacturerStock.cost)} />
            </FormField>
          ) : null}
          {selectedInventory ? (
            <FormField label="Localização na loja">
              <Input disabled value={selectedInventory.location} />
            </FormField>
          ) : null}
          <FormField label="Observação" className="md:col-span-2 xl:col-span-4">
            <Textarea {...form.register("note")} />
          </FormField>
          <div className="xl:col-span-4">
            <Button size="lg" disabled={!selectedInventory || selectedInventory.stock <= 0}>
              Confirmar saída
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

