import { ChevronRight, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getIcon } from "@/components/shared/icon-map";
import { homeModules } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", route: "/app", icon: "LayoutDashboard" },
  { title: "Orçamento", route: "/app/orcamento", icon: "Calculator" },
  { title: "Produto", route: "/app/produtos", icon: "Boxes" },
  {
    title: "Estoque",
    route: "/app/estoque",
    icon: "Package",
    children: [
      { title: "Entrada", route: "/app/entrada", icon: "PackagePlus" },
      { title: "Saída", route: "/app/saida", icon: "ShoppingCart" },
    ],
  },
  { title: "Pedido", route: "/app/pedido", icon: "FileText" },
  { title: "Clientes", route: "/app/clientes", icon: "Users" },
  { title: "Fornecedores", route: "/app/fornecedores", icon: "Truck" },
  { title: "Relatórios", route: "/app/relatorios", icon: "BarChart3" },
  { title: "Configuração", route: "/app/configuracoes", icon: "Settings" },
  { title: "Sair", route: "/login", icon: "LogOut" },
] as const;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stockMenuOpen, setStockMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentModule = useMemo(
    () => {
      for (const item of menuItems) {
        if (item.route === location.pathname) {
          return item;
        }

        if ("children" in item) {
          const child = item.children.find((entry) => entry.route === location.pathname);
          if (child) {
            return child;
          }
        }
      }

      return homeModules.find((item) => item.route === location.pathname);
    },
    [location.pathname],
  );

  useEffect(() => {
    if (location.pathname === "/app/estoque" || location.pathname === "/app/entrada" || location.pathname === "/app/saida") {
      setStockMenuOpen(true);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-[#74777F] px-6 py-8 text-slate-900 lg:block">
          <SidebarContent
            stockMenuOpen={stockMenuOpen}
            onToggleStockMenu={() => setStockMenuOpen((value) => !value)}
            onOpenAttendance={() => navigate("/app/atendimento")}
          />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-[#165DCC] px-4 py-4 text-white shadow-lg backdrop-blur md:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-100">Auto Vitrais</p>
                <p className="truncate text-lg font-semibold">
                  {currentModule?.title ?? "Painel de operação"}
                </p>
              </div>
              <button
                className="rounded-2xl bg-white/10 p-3"
                onClick={() => setMobileOpen((value) => !value)}
            >
                <Menu className="size-5" />
              </button>
            </div>
            {mobileOpen ? (
              <>
                <button
                  className="fixed inset-0 top-[73px] z-30 bg-slate-950/35"
                  aria-label="Fechar menu"
                  onClick={() => setMobileOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full z-40 mt-0 border-t border-white/10 bg-white p-4 text-slate-900 shadow-2xl">
                  <MobileNav
                    close={() => setMobileOpen(false)}
                    stockMenuOpen={stockMenuOpen}
                    onToggleStockMenu={() => setStockMenuOpen((value) => !value)}
                    onOpenAttendance={() => {
                      setMobileOpen(false);
                      navigate("/app/atendimento");
                    }}
                  />
                </div>
              </>
            ) : null}
          </header>

          <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  stockMenuOpen,
  onToggleStockMenu,
  onOpenAttendance,
}: {
  stockMenuOpen: boolean;
  onToggleStockMenu: () => void;
  onOpenAttendance: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="rounded-[28px] bg-white p-5 shadow-panel">
        <img
          src="/logo.png"
          alt="Byzord Auto Vitrais"
          className="mx-auto w-full max-w-[220px] object-contain"
        />
        <Button
          size="lg"
          className="mt-5 w-full rounded-2xl bg-slate-300 text-slate-800 hover:bg-slate-200"
          onClick={onOpenAttendance}
        >
          Abrir atendimento
        </Button>
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = getIcon(item.icon);
          const isStockGroup = "children" in item;
          return (
            <div key={item.route} className="space-y-2">
              {isStockGroup ? (
                <>
                  <button
                    type="button"
                    onClick={onToggleStockMenu}
                    className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/20 hover:text-white",
                      stockMenuOpen && "bg-white text-slate-800",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-5" />
                      {item.title}
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-4 opacity-70 transition-transform",
                        stockMenuOpen && "rotate-90",
                      )}
                    />
                  </button>
                </>
              ) : (
                <NavLink
                  to={item.route}
                  end={item.route === "/app"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/20 hover:text-white",
                      isActive && "bg-white text-slate-800",
                    )
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-5" />
                    {item.title}
                  </span>
                </NavLink>
              )}

              {isStockGroup && stockMenuOpen ? (
                <div className="ml-6 space-y-1 border-l border-white/25 pl-4">
                  {item.children.map((child) => {
                    const ChildIcon = getIcon(child.icon);
                    return (
                      <NavLink
                        key={child.route}
                        to={child.route}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/20 hover:text-white",
                            isActive && "bg-white/20 text-white",
                          )
                        }
                      >
                        <ChildIcon className="size-4" />
                        {child.title}
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[28px] bg-white/20 p-5 text-sm text-white">
        <p className="font-semibold">Operação protegida</p>
        <p className="mt-2 text-slate-100">
          Logs, permissões por perfil e base pronta para Supabase/PostgreSQL.
        </p>
      </div>
    </div>
  );
}

function MobileNav({
  close,
  stockMenuOpen,
  onToggleStockMenu,
  onOpenAttendance,
}: {
  close: () => void;
  stockMenuOpen: boolean;
  onToggleStockMenu: () => void;
  onOpenAttendance: () => void;
}) {
  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={onOpenAttendance}>
        Abrir atendimento
      </Button>
      {menuItems.map((item) => {
        const Icon = getIcon(item.icon);
        const isStockGroup = "children" in item;

        return (
          <div key={item.route} className="space-y-2">
            {isStockGroup ? (
              <button
                type="button"
                onClick={onToggleStockMenu}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-primary" />
                  <span className="font-semibold text-slate-900">{item.title}</span>
                </div>
                <ChevronRight
                  className={cn(
                    "size-5 text-slate-500 transition-transform",
                    stockMenuOpen && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <Link
                to={item.route}
                onClick={close}
                className="flex items-center gap-3 rounded-2xl border border-border bg-slate-50 p-4 shadow-sm"
              >
                <Icon className="size-5 text-primary" />
                <span className="font-semibold text-slate-900">{item.title}</span>
              </Link>
            )}

            {isStockGroup && stockMenuOpen ? (
              <div className="ml-4 space-y-2 border-l border-slate-200 pl-4">
                {item.children.map((child) => {
                  const ChildIcon = getIcon(child.icon);
                  return (
                    <Link
                      key={child.route}
                      to={child.route}
                      onClick={close}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
                    >
                      <ChildIcon className="size-5 text-primary" />
                      <span className="font-semibold text-slate-900">{child.title}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
