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

export type RolePermissionMap = Record<AppPage, PagePermission>;

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionMap> = {
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

export function getPagePermission(role: UserRole, page: AppPage): PagePermission {
  return ROLE_PERMISSIONS[role][page] ?? "none";
}

export function canAccessPage(role: UserRole, page: AppPage): boolean {
  return getPagePermission(role, page) !== "none";
}

export function canEditPage(role: UserRole, page: AppPage): boolean {
  return getPagePermission(role, page) === "write";
}

export function getAllowedRoles(page: AppPage): UserRole[] {
  return (Object.keys(ROLE_PERMISSIONS) as UserRole[]).filter(
    (role) => canAccessPage(role, page),
  );
}
