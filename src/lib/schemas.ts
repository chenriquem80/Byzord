import { z } from "zod";

export const productSchema = z.object({
  internalCode: z.string().min(3, "Informe o código interno."),
  supplierCode: z.string().default(""),
  barcode: z.string().min(8, "Informe o código de barras."),
  name: z.string().min(3, "Informe o nome do produto."),
  isTypeB: z.boolean().optional().default(false),
  isTypeR: z.boolean().optional().default(false),
  glassType: z.string().min(1, "Selecione o tipo de vidro."),
  feature: z.string().min(1, "Selecione a característica."),
  manufacturer: z.string().min(1, "Selecione o fabricante."),
  brand: z.string().min(2, "Informe a marca."),
  description: z.string().optional().default(""),
  location: z.string().optional().default(""),
  quantity: z.coerce.number().min(0).optional().default(0),
  minimum: z.coerce.number().min(0).optional().default(0),
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
  productName: z.string().optional().default(""),
  customer: z.string().optional().default(""),
  customerVehicle: z.string().optional().default(""),
  plate: z.string().optional().default(""),
  paymentMethod: z.string().optional().default(""),
  quantity: z.coerce.number().min(1, "Quantidade mínima de 1."),
  price: z.coerce.number().min(0.01, "Informe o valor da venda."),
  discount: z.coerce.number().min(0).default(0),
  note: z.string().optional(),
});
