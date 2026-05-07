import { z } from "zod";

export const productSchema = z.object({
  internalCode: z.string().min(3, "Informe o código interno."),
  supplierCode: z.string().default(""),
  barcode: z.string().min(8, "Informe o código de barras."),
  name: z.string().min(3, "Informe o nome do produto."),
  isTypeB: z.boolean().default(false),
  glassType: z.string().min(1, "Selecione o tipo de vidro."),
  feature: z.string().min(1, "Selecione a característica."),
  manufacturer: z.string().min(1, "Selecione o fabricante."),
  brand: z.string().min(2, "Informe a marca."),
  description: z.string().min(5, "Informe a descrição."),
  location: z.string().min(2, "Informe a localização."),
  quantity: z.coerce.number().min(0),
  minimum: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  lastPurchaseDate: z.string().min(1, "Informe a data da última compra."),
  lastSupplier: z.string().min(2, "Informe o último fornecedor."),
  status: z.enum(["ativo", "inativo"]),
  notes: z.string().optional(),
});

export const entrySchema = z.object({
  storeId: z.string().min(1, "Selecione a loja."),
  productId: z.string().min(1, "Selecione um produto."),
  manufacturer: z.string().min(1, "Selecione o fabricante."),
  supplier: z.string().min(2, "Informe o fornecedor."),
  quantity: z.coerce.number().min(1, "Quantidade mínima de 1."),
  cost: z.coerce.number().min(0.01, "Informe o preço de custo."),
  purchaseDate: z.string().min(1, "Informe a data da compra."),
  invoiceNumber: z.string().min(3, "Informe o número da nota."),
  note: z.string().optional(),
});

export const saleSchema = z.object({
  storeId: z.string().min(1, "Selecione a loja."),
  productId: z.string().min(1, "Selecione um produto."),
  manufacturer: z.string().min(1, "Selecione o fabricante."),
  customer: z.string().min(2, "Informe o cliente."),
  customerVehicle: z.string().min(2, "Informe o veículo do cliente."),
  plate: z.string().min(7, "Informe a placa."),
  paymentMethod: z.string().min(2, "Informe a forma de pagamento."),
  quantity: z.coerce.number().min(1, "Quantidade mínima de 1."),
  price: z.coerce.number().min(0.01, "Informe o valor da venda."),
  discount: z.coerce.number().min(0),
  note: z.string().optional(),
});
