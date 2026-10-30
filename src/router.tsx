import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/shared/auth-guard";

const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const AgendaPage = lazy(() => import("@/pages/agenda/agenda-page").then((module) => ({ default: module.AgendaPage })));
const AgendaQueryPage = lazy(() => import("@/pages/agenda/agenda-query-page").then((module) => ({ default: module.AgendaQueryPage })));
const AttendancePage = lazy(() => import("@/pages/attendance/attendance-page").then((module) => ({ default: module.AttendancePage })));
const AttendanceQueryPage = lazy(() => import("@/pages/attendance/attendance-query-page").then((module) => ({ default: module.AttendanceQueryPage })));
const StockPage = lazy(() => import("@/pages/stock/stock-page").then((module) => ({ default: module.StockPage })));
const ExitPage = lazy(() => import("@/pages/exit/exit-page").then((module) => ({ default: module.ExitPage })));
const EntryPage = lazy(() => import("@/pages/entry/entry-page").then((module) => ({ default: module.EntryPage })));
const RecordsPage = lazy(() => import("@/pages/records/records-page").then((module) => ({ default: module.RecordsPage })));
const OrdersPage = lazy(() => import("@/pages/orders/orders-page").then((module) => ({ default: module.OrdersPage })));
const PaintingPage = lazy(() => import("@/pages/painting/painting-page").then((module) => ({ default: module.PaintingPage })));
const QuotePrintPage = lazy(() => import("@/pages/quotes/quote-document").then((module) => ({ default: module.QuoteDocument })));
const QuotesPage = lazy(() => import("@/pages/quotes/quotes-page").then((module) => ({ default: module.QuotesPage })));
const LabelsPage = lazy(() => import("@/pages/labels/labels-page").then((module) => ({ default: module.LabelsPage })));
const ReplenishmentPage = lazy(() => import("@/pages/replenishment/replenishment-page").then((module) => ({ default: module.ReplenishmentPage })));
const ProductsPage = lazy(() => import("@/pages/products/products-page").then((module) => ({ default: module.ProductsPage })));
const VehiclesPage = lazy(() => import("@/pages/vehicles/vehicles-page").then((module) => ({ default: module.VehiclesPage })));
const SuppliersPage = lazy(() => import("@/pages/suppliers/suppliers-page").then((module) => ({ default: module.SuppliersPage })));
const CustomersPage = lazy(() => import("@/pages/customers/customers-page").then((module) => ({ default: module.CustomersPage })));
const ReportsPage = lazy(() => import("@/pages/reports/reports-page").then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import("@/pages/settings/settings-page").then((module) => ({ default: module.SettingsPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password-page").then((module) => ({ default: module.ForgotPasswordPage })));
const ChangePasswordPage = lazy(() => import("@/pages/change-password-page").then((module) => ({ default: module.ChangePasswordPage })));
const UserManagementPage = lazy(() => import("@/pages/settings/user-management-page").then((module) => ({ default: module.UserManagementPage })));
const TransferPage = lazy(() => import("@/pages/transfer/transfer-page").then((module) => ({ default: module.TransferPage })));
const RegisterPage = lazy(() => import("@/pages/register-page").then((module) => ({ default: module.RegisterPage })));
const PartOrdersPage = lazy(() => import("@/pages/part-orders/part-orders-page").then((module) => ({ default: module.PartOrdersPage })));

function withSuspense(component: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="rounded-[28px] bg-white p-8 text-sm text-slate-500 shadow-panel">
          Carregando módulo...
        </div>
      }
    >
      {component}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/home",
    element: <Navigate to="/app" replace />,
  },
  {
    path: "/atendimento",
    element: <Navigate to="/app/atendimento" replace />,
  },
  {
    path: "/estoque",
    element: <Navigate to="/app/estoque" replace />,
  },
  {
    path: "/saida",
    element: <Navigate to="/app/saida" replace />,
  },
  {
    path: "/orcamento",
    element: <Navigate to="/app/orcamento" replace />,
  },
  {
    path: "/entrada",
    element: <Navigate to="/app/entrada" replace />,
  },
  {
    path: "/registro",
    element: <Navigate to="/app/registro" replace />,
  },
  {
    path: "/pedido",
    element: <Navigate to="/app/pedido" replace />,
  },
  {
    path: "/etiquetagem",
    element: <Navigate to="/app/etiquetagem" replace />,
  },
  {
    path: "/reposicao",
    element: <Navigate to="/app/reposicao" replace />,
  },
  {
    path: "/produtos",
    element: <Navigate to="/app/produtos" replace />,
  },
  {
    path: "/veiculos",
    element: <Navigate to="/app/veiculos" replace />,
  },
  {
    path: "/fornecedores",
    element: <Navigate to="/app/fornecedores" replace />,
  },
  {
    path: "/clientes",
    element: <Navigate to="/app/clientes" replace />,
  },
  {
    path: "/relatorios",
    element: <Navigate to="/app/relatorios" replace />,
  },
  {
    path: "/configuracoes",
    element: <Navigate to="/app/configuracoes" replace />,
  },
  {
    path: "/login",
    element: withSuspense(<LoginPage />),
  },
  {
    path: "/register",
    element: withSuspense(<RegisterPage />),
  },
  {
    path: "/forgot-password",
    element: withSuspense(<ForgotPasswordPage />),
  },
  {
    path: "/change-password",
    element: withSuspense(
      <AuthGuard>
        <ChangePasswordPage />
      </AuthGuard>
    ),
  },
  {
    path: "/app",
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: withSuspense(<AuthGuard page="/app"><DashboardPage /></AuthGuard>) },
      { path: "home", element: <Navigate to="/app" replace /> },
      { path: "agenda",      element: withSuspense(<AuthGuard page="/app/agenda"><AgendaPage /></AuthGuard>) },
      { path: "agenda-consulta", element: withSuspense(<AuthGuard page="/app/agenda-consulta"><AgendaQueryPage /></AuthGuard>) },
      { path: "atendimento", element: withSuspense(<AuthGuard page="/app/atendimento"><AttendancePage /></AuthGuard>) },
      { path: "atendimento-consulta", element: withSuspense(<AuthGuard page="/app/atendimento-consulta"><AttendanceQueryPage /></AuthGuard>) },
      { path: "estoque",     element: withSuspense(<AuthGuard page="/app/estoque"><StockPage /></AuthGuard>) },
      { path: "saida",       element: withSuspense(<AuthGuard page="/app/saida"><ExitPage /></AuthGuard>) },
      { path: "pintura",     element: withSuspense(<AuthGuard page="/app/pintura"><PaintingPage /></AuthGuard>) },
      { path: "imprimir-orcamento", element: withSuspense(<AuthGuard page="/app/imprimir-orcamento"><QuotePrintPage /></AuthGuard>) },
      { path: "orcamento",   element: withSuspense(<AuthGuard page="/app/orcamento"><QuotesPage /></AuthGuard>) },
      { path: "entrada",     element: withSuspense(<AuthGuard page="/app/entrada"><EntryPage /></AuthGuard>) },
      { path: "registro",    element: withSuspense(<AuthGuard page="/app/registro"><RecordsPage /></AuthGuard>) },
      { path: "pedido",      element: withSuspense(<AuthGuard page="/app/pedido"><OrdersPage /></AuthGuard>) },
      { path: "etiquetagem", element: withSuspense(<AuthGuard page="/app/etiquetagem"><LabelsPage /></AuthGuard>) },
      { path: "reposicao",   element: withSuspense(<AuthGuard page="/app/reposicao"><ReplenishmentPage /></AuthGuard>) },
      { path: "produtos",    element: withSuspense(<AuthGuard page="/app/produtos"><ProductsPage /></AuthGuard>) },
      { path: "veiculos",    element: withSuspense(<AuthGuard page="/app/veiculos"><VehiclesPage /></AuthGuard>) },
      { path: "fornecedores",element: withSuspense(<AuthGuard page="/app/fornecedores"><SuppliersPage /></AuthGuard>) },
      { path: "clientes",    element: withSuspense(<AuthGuard page="/app/clientes"><CustomersPage /></AuthGuard>) },
      { path: "relatorios",  element: withSuspense(<AuthGuard page="/app/relatorios"><ReportsPage /></AuthGuard>) },
      { path: "configuracoes",element: withSuspense(<AuthGuard page="/app/configuracoes"><SettingsPage /></AuthGuard>) },
      { path: "usuarios",    element: withSuspense(<AuthGuard page="/app/usuarios"><UserManagementPage /></AuthGuard>) },
      { path: "transferencia",element: withSuspense(<AuthGuard page="/app/transferencia"><TransferPage /></AuthGuard>) },
      { path: "encomenda",   element: withSuspense(<AuthGuard page="/app/encomenda"><PartOrdersPage /></AuthGuard>) },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
