import { ChevronRight, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getIcon } from "@/components/shared/icon-map";
import { homeModules } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types/domain";

interface MenuItem {
  title: string;
  route: string;
  icon: string;
  allowedRoles?: UserRole[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { title: "Inicial", route: "/app", icon: "LayoutDashboard" },
  {
    title: "Atendimento",
    route: "/app/atendimento",
    icon: "ClipboardList",
    children: [
      { title: "Consulta", route: "/app/atendimento", icon: "Search" },
      { title: "Alteração de atendimentos abertos", route: "/app/pedido", icon: "Pencil" },
    ],
  },
  { title: "Orçamento", route: "/app/orcamento", icon: "Calculator" },
  {
    title: "Estoque",
    route: "/app/estoque",
    icon: "Package",
    children: [
      { title: "Consulta", route: "/app/estoque", icon: "Search" },
      { title: "Entrada", route: "/app/entrada", icon: "PackagePlus", allowedRoles: ["ADMIN", "GERENTE", "ESTOQUISTA"] },
      { title: "Saída", route: "/app/saida", icon: "ShoppingCart" },
      { title: "Transferir", route: "/app/transferencia", icon: "ArrowLeftRight", allowedRoles: ["ADMIN", "GERENTE", "ESTOQUISTA"] },
    ],
  },
  { title: "Relatórios", route: "/app/relatorios", icon: "BarChart3", allowedRoles: ["ADMIN", "GERENTE"] },
  { title: "Usuários", route: "/app/usuarios", icon: "UserCog", allowedRoles: ["ADMIN"] },
  { title: "Sair", route: "/login", icon: "LogOut" },
];

// Routes that belong to each group (for auto-expand on navigation)
const groupChildRoutes: Record<string, string[]> = {
  "/app/atendimento": ["/app/atendimento", "/app/pedido"],
  "/app/estoque": ["/app/estoque", "/app/entrada", "/app/saida", "/app/transferencia"],
};

export function AppShell() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (item.allowedRoles && user && !item.allowedRoles.includes(user.role)) return false;
      return true;
    }).map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => {
            if (child.allowedRoles && user && !child.allowedRoles.includes(user.role)) return false;
            return true;
          }),
        };
      }
      return item;
    });
  }, [user]);

  function toggleMenu(route: string) {
    setOpenMenus(prev => {
      const next = new Set(prev);
      if (next.has(route)) next.delete(route); else next.add(route);
      return next;
    });
  }

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  const currentModule = useMemo(() => {
    for (const item of filteredMenuItems) {
      if (item.route === location.pathname) return item;
      if (item.children) {
        const child = item.children.find((c) => c.route === location.pathname);
        if (child) return child;
      }
    }
    return homeModules.find((item) => item.route === location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Auto-expand group when navigating to a child route
  useEffect(() => {
    for (const [groupRoute, childRoutes] of Object.entries(groupChildRoutes)) {
      if (childRoutes.includes(location.pathname)) {
        setOpenMenus(prev => new Set([...prev, groupRoute]));
      }
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-[#74777F] px-6 py-8 text-slate-900 lg:block">
          <SidebarContent
            openMenus={openMenus}
            onToggleMenu={toggleMenu}
            filteredMenuItems={filteredMenuItems}
            handleLogout={handleLogout}
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
                onClick={() => setMobileOpen((v) => !v)}
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
                    openMenus={openMenus}
                    onToggleMenu={toggleMenu}
                    filteredMenuItems={filteredMenuItems}
                    handleLogout={handleLogout}
                  />
                </div>
              </>
            ) : null}
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6 xl:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  openMenus,
  onToggleMenu,
  filteredMenuItems,
  handleLogout,
}: {
  openMenus: Set<string>;
  onToggleMenu: (route: string) => void;
  filteredMenuItems: MenuItem[];
  handleLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="rounded-[28px] bg-white p-5 shadow-panel">
        <img
          src="/logo.png"
          alt="Byzord Auto Vitrais"
          className="mx-auto w-full max-w-[220px] object-contain"
        />
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        {filteredMenuItems.map((item) => {
          const Icon = getIcon(item.icon);
          const isGroup = item.children && item.children.length > 0;
          const isOpen = openMenus.has(item.route);

          if (item.title === "Sair") {
            return (
              <button
                key={item.route}
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/20 hover:text-white"
              >
                <Icon className="size-5" />
                {item.title}
              </button>
            );
          }

          return (
            <div key={item.route} className="space-y-2">
              {isGroup ? (
                <button
                  type="button"
                  onClick={() => onToggleMenu(item.route)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/20 hover:text-white",
                    isOpen && "bg-white text-slate-800",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-5" />
                    {item.title}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 opacity-70 transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>
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

              {isGroup && isOpen ? (
                <div className="ml-6 space-y-1 border-l border-white/25 pl-4">
                  {item.children?.map((child) => {
                    const ChildIcon = getIcon(child.icon);
                    return (
                      <NavLink
                        key={child.route + child.title}
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
    </div>
  );
}

function MobileNav({
  close,
  openMenus,
  onToggleMenu,
  filteredMenuItems,
  handleLogout,
}: {
  close: () => void;
  openMenus: Set<string>;
  onToggleMenu: (route: string) => void;
  filteredMenuItems: MenuItem[];
  handleLogout: () => void;
}) {
  return (
    <div className="space-y-3">
      {filteredMenuItems.map((item) => {
        const Icon = getIcon(item.icon);
        const isGroup = item.children && item.children.length > 0;
        const isOpen = openMenus.has(item.route);

        if (item.title === "Sair") {
          return (
            <button
              key={item.route}
              onClick={() => { close(); handleLogout(); }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-slate-50 p-4 shadow-sm"
            >
              <Icon className="size-5 text-primary" />
              <span className="font-semibold text-slate-900">{item.title}</span>
            </button>
          );
        }

        return (
          <div key={item.route} className="space-y-2">
            {isGroup ? (
              <button
                type="button"
                onClick={() => onToggleMenu(item.route)}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-primary" />
                  <span className="font-semibold text-slate-900">{item.title}</span>
                </div>
                <ChevronRight
                  className={cn(
                    "size-5 text-slate-500 transition-transform",
                    isOpen && "rotate-90",
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

            {isGroup && isOpen ? (
              <div className="ml-4 space-y-2 border-l border-slate-200 pl-4">
                {item.children?.map((child) => {
                  const ChildIcon = getIcon(child.icon);
                  return (
                    <Link
                      key={child.route + child.title}
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
