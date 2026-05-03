import {
  BarChart3,
  Boxes,
  Calculator,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PlaySquare,
  FileText,
  Package,
  PackagePlus,
  QrCode,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Package,
  ShoppingCart,
  PackagePlus,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  PlaySquare,
  QrCode,
  RefreshCcw,
  Boxes,
  Calculator,
  CarFront,
  Truck,
  Users,
  BarChart3,
  Settings,
};

export function getIcon(name: string) {
  return icons[name] ?? Package;
}
