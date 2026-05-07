import type { UserRole } from "@/types/domain";

export type PagePermission = "write" | "read" | "none";

export type AppPage =
  | "/app"
  | "/app/atendimento"
  | "/app/estoque"
  | "/app/entrada"
  | "/app/saida"
  | "/app/orcamento"
  | "/app/pedido"
  | "/app/etiquetagem"
  | "/app/reposicao"
  | "/app/produtos"
  | "/app/veiculos"
  | "/app/fornecedores"
  | "/app/clientes"
  | "/app/relatorios"
  | "/app/configuracoes"
  | "/app/transferencia"
  | "/app/registro"
  | "/app/usuarios";

export const PAGE_LABELS: Record<AppPage, string> = {
  "/app":               "Dashboard",
  "/app/atendimento":   "Atendimento",
  "/app/estoque":       "Estoque",
  "/app/entrada":       "Entrada",
  "/app/saida":         "Saída",
  "/app/orcamento":     "Orçamento",
  "/app/pedido":        "Pedido",
  "/app/etiquetagem":   "Etiquetagem",
  "/app/reposicao":     "Reposição",
  "/app/produtos":      "Produtos",
  "/app/veiculos":      "Veículos",
  "/app/fornecedores":  "Fornecedores",
  "/app/clientes":      "Clientes",
  "/app/relatorios":    "Relatórios",
  "/app/configuracoes": "Configurações",
  "/app/transferencia": "Transferência",
  "/app/registro":      "Registro",
  "/app/usuarios":      "Usuários",
};

export const ALL_PAGES = Object.keys(PAGE_LABELS) as AppPage[];

export type RolePermissionMap = Record<AppPage, PagePermission>;

const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissionMap> = {
  ADMIN: {
    "/app":               "write",
    "/app/atendimento":   "write",
    "/app/estoque":       "write",
    "/app/entrada":       "write",
    "/app/saida":         "write",
    "/app/orcamento":     "write",
    "/app/pedido":        "write",
    "/app/etiquetagem":   "write",
    "/app/reposicao":     "write",
    "/app/produtos":      "write",
    "/app/veiculos":      "write",
    "/app/fornecedores":  "write",
    "/app/clientes":      "write",
    "/app/relatorios":    "write",
    "/app/configuracoes": "write",
    "/app/transferencia": "write",
    "/app/registro":      "write",
    "/app/usuarios":      "write",
  },
  GERENTE: {
    "/app":               "read",
    "/app/atendimento":   "write",
    "/app/estoque":       "read",
    "/app/entrada":       "write",
    "/app/saida":         "write",
    "/app/orcamento":     "write",
    "/app/pedido":        "write",
    "/app/etiquetagem":   "write",
    "/app/reposicao":     "read",
    "/app/produtos":      "read",
    "/app/veiculos":      "read",
    "/app/fornecedores":  "write",
    "/app/clientes":      "write",
    "/app/relatorios":    "read",
    "/app/configuracoes": "read",
    "/app/transferencia": "write",
    "/app/registro":      "read",
    "/app/usuarios":      "none",
  },
  ATENDENTE: {
    "/app":               "read",
    "/app/atendimento":   "write",
    "/app/estoque":       "read",
    "/app/entrada":       "none",
    "/app/saida":         "write",
    "/app/orcamento":     "write",
    "/app/pedido":        "none",
    "/app/etiquetagem":   "none",
    "/app/reposicao":     "none",
    "/app/produtos":      "none",
    "/app/veiculos":      "none",
    "/app/fornecedores":  "none",
    "/app/clientes":      "read",
    "/app/relatorios":    "none",
    "/app/configuracoes": "none",
    "/app/transferencia": "none",
    "/app/registro":      "read",
    "/app/usuarios":      "none",
  },
  ESTOQUISTA: {
    "/app":               "read",
    "/app/atendimento":   "none",
    "/app/estoque":       "read",
    "/app/entrada":       "write",
    "/app/saida":         "write",
    "/app/orcamento":     "none",
    "/app/pedido":        "none",
    "/app/etiquetagem":   "write",
    "/app/reposicao":     "read",
    "/app/produtos":      "none",
    "/app/veiculos":      "none",
    "/app/fornecedores":  "none",
    "/app/clientes":      "none",
    "/app/relatorios":    "none",
    "/app/configuracoes": "none",
    "/app/transferencia": "write",
    "/app/registro":      "read",
    "/app/usuarios":      "none",
  },
};

const STORAGE_KEY = "byzord_role_permissions";

function loadOverrides(): Partial<Record<UserRole, Partial<RolePermissionMap>>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getRolePermissions(role: UserRole): RolePermissionMap {
  const overrides = loadOverrides();
  return { ...DEFAULT_PERMISSIONS[role], ...(overrides[role] ?? {}) };
}

export function saveRolePermissions(role: UserRole, map: RolePermissionMap): void {
  const overrides = loadOverrides();
  overrides[role] = map;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getPagePermission(role: UserRole, page: AppPage): PagePermission {
  return getRolePermissions(role)[page] ?? "none";
}

export function canAccessPage(role: UserRole, page: AppPage): boolean {
  return getPagePermission(role, page) !== "none";
}

export function canEditPage(role: UserRole, page: AppPage): boolean {
  return getPagePermission(role, page) === "write";
}

export function getAllowedRoles(page: AppPage): UserRole[] {
  return (Object.keys(DEFAULT_PERMISSIONS) as UserRole[]).filter(
    (role) => canAccessPage(role, page),
  );
}

export const ROLE_PERMISSIONS = DEFAULT_PERMISSIONS;
