export type UserRole = "ADMIN" | "GERENTE" | "ATENDENTE" | "ESTOQUISTA";
export type ProductStatus = "ativo" | "inativo";
export type GlassType =
  | "Parabrisa"
  | "Vigia"
  | "Porta dianteira"
  | "Porta traseira"
  | "Lateral fixa"
  | "Quebra-vento"
  | "Teto solar";
export type ProductFeature =
  | "Verde"
  | "Verde sensor"
  | "Degradê"
  | "Degradê sensor"
  | "Incolor"
  | "Térmico";
export type MovementType = "Entrada" | "Saída" | "Ajuste" | "Perda" | "Devolução";
export type OrderStatus = "aberto" | "enviado" | "recebido" | "cancelado";

export interface Store {
  id: string;
  name: string;
  code: string;
  city: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  storeName: string;
  allowCostView: boolean;
  mustChangePassword?: boolean;
}

export interface VehicleCompatibility {
  id: string;
  automaker: string;
  model: string;
  generation: string;
  startYear: number;
  endYear: number;
  version: string;
  note?: string;
}

export interface ManufacturerStock {
  id: string;
  manufacturer: string;
  cost: number;
  price: number;
  lastPurchaseDate: string;
  supplier: string;
  inventories: StoreInventory[];
}

export interface StoreInventory {
  id: string;
  storeId: string;
  storeName: string;
  location: string;
  stock: number;
  minQuantity: number;
}

export interface Product {
  id: string;
  internalCode: string;
  supplierCode: string;
  barcode: string;
  name: string;
  glassType: GlassType;
  feature: ProductFeature;
  brand: string;
  description: string;
  photos: string[];
  status: ProductStatus;
  notes: string;
  manufacturers: ManufacturerStock[];
  compatibilities: VehicleCompatibility[];
}

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
  whatsapp: string;
  email: string;
  suppliedProducts: string[];
  lastPurchaseDate: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  document: string;
  plate: string;
  vehicleModel: string;
  purchaseCount: number;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  storeId: string;
  storeName: string;
  productId: string;
  productCode: string;
  productName: string;
  manufacturer: string;
  supplier?: string;
  quantity: number;
  user: string;
  date: string;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  suggestedQuantity: number;
  suggestedSupplier: string;
  lastPurchaseDate: string;
  previousCost: number;
  status: OrderStatus;
  note?: string;
}

export interface LabelRecord {
  id: string;
  storeId: string;
  storeName: string;
  productCode: string;
  productName: string;
  glassType: GlassType;
  vehicleLabel: string;
  yearRange: string;
  feature: string;
  manufacturer: string;
  purchaseSummary: string;
  location: string;
  qrCode: string;
  barcode: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  helper: string;
  breakdown?: string[];
  tone?: "default" | "success" | "warning" | "danger";
}

export interface ModuleSummary {
  title: string;
  description: string;
  route: string;
  icon: string;
  alertCount?: number;
}

export interface ServiceOption {
  id: string;
  title: string;
  description: string;
}

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  storeName: string;
  openedAt: string;
  plate: string;
  serviceType: string;
  billingType: "Seguro" | "Particular";
  videoDone: boolean;
  status: "Pendente estoque" | "Em separacao" | "Finalizado";
}
