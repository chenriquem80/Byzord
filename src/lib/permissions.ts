import type { User, UserRole } from "@/types/domain";

export type PagePermission = "write" | "read" | "none";

export type AppPage =
  | "/app"
  | "/app/agenda"
  | "/app/agenda-consulta"
  | "/app/atendimento"
  | "/app/atendimento-consulta"
  | "/app/estoque"
  | "/app/entrada"
  | "/app/saida"
  | "/app/orcamento"
  | "/app/pintura"
  | "/app/imprimir-orcamento"
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
  "/app":                       "Dashboard",
  "/app/agenda":                "Agenda",
  "/app/agenda-consulta":       "Consulta da Agenda",
  "/app/atendimento":           "Novo Atendimento",
  "/app/atendimento-consulta":  "Consulta de Atendimentos",
  "/app/estoque":               "Estoque",
  "/app/entrada":               "Entrada",
  "/app/saida":                 "Saída",
  "/app/orcamento":             "Orçamento",
  "/app/pintura":               "Pintura",
  "/app/imprimir-orcamento":    "Imprimir orçamento",
  "/app/pedido":                "Pedido",
  "/app/etiquetagem":           "Etiquetagem",
  "/app/reposicao":             "Reposição",
  "/app/produtos":              "Produtos",
  "/app/veiculos":              "Veículos",
  "/app/fornecedores":          "Fornecedores",
  "/app/clientes":              "Clientes",
  "/app/relatorios":            "Relatórios",
  "/app/configuracoes":         "Configurações",
  "/app/transferencia":         "Transferência",
  "/app/registro":              "Registro",
  "/app/usuarios":              "Usuários",
};

export const ALL_PAGES = Object.keys(PAGE_LABELS) as AppPage[];

// Páginas exibidas na dialog de permissões — agrupadas como no menu lateral
export const SIDEBAR_PAGE_GROUPS: { title: string; pages: { page: AppPage; label: string }[] }[] = [
  { title: "Inicial", pages: [{ page: "/app", label: "Inicial" }] },
  { title: "Agenda", pages: [
    { page: "/app/agenda", label: "Anotar" },
    { page: "/app/agenda-consulta", label: "Consulta" },
  ] },
  { title: "Atendimento", pages: [
    { page: "/app/atendimento", label: "Novo atendimento" },
    { page: "/app/atendimento-consulta", label: "Consulta" },
  ] },
  { title: "Orçamento", pages: [{ page: "/app/orcamento", label: "Orçamento" }] },
  { title: "Estoque", pages: [
    { page: "/app/estoque", label: "Consulta" },
    { page: "/app/entrada", label: "Entrada" },
    { page: "/app/saida", label: "Saída" },
    { page: "/app/transferencia", label: "Transferir" },
    { page: "/app/produtos", label: "Produtos" },
    { page: "/app/etiquetagem", label: "Etiquetagem" },
    { page: "/app/reposicao", label: "Reposição" },
  ] },
  { title: "Funções", pages: [
    { page: "/app/pintura", label: "Pintura" },
    { page: "/app/imprimir-orcamento", label: "Imprimir orçamento" },
  ] },
  { title: "Relatórios", pages: [{ page: "/app/relatorios", label: "Relatórios" }] },
  { title: "Usuários", pages: [{ page: "/app/usuarios", label: "Usuários" }] },
];

export const SIDEBAR_PAGES: AppPage[] = SIDEBAR_PAGE_GROUPS.flatMap((g) => g.pages.map((p) => p.page));

export type RolePermissionMap = Record<AppPage, PagePermission>;

const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissionMap> = {
  // Acesso total a tudo
  ADMIN: {
    "/app":                       "write",
    "/app/agenda":                "write",
    "/app/agenda-consulta":       "write",
    "/app/atendimento":           "write",
    "/app/atendimento-consulta":  "write",
    "/app/estoque":               "write",
    "/app/entrada":               "write",
    "/app/saida":                 "write",
    "/app/orcamento":             "write",
    "/app/imprimir-orcamento":    "write",
    "/app/pintura":               "write",
    "/app/pedido":                "write",
    "/app/etiquetagem":           "write",
    "/app/reposicao":             "write",
    "/app/produtos":              "write",
    "/app/veiculos":              "write",
    "/app/fornecedores":          "write",
    "/app/clientes":              "write",
    "/app/relatorios":            "write",
    "/app/configuracoes":         "write",
    "/app/transferencia":         "write",
    "/app/registro":              "write",
    "/app/usuarios":              "write",
  },
  // Acesso total, exceto cadastro de usuários
  GERENTE: {
    "/app":                       "write",
    "/app/agenda":                "write",
    "/app/agenda-consulta":       "write",
    "/app/atendimento":           "write",
    "/app/atendimento-consulta":  "write",
    "/app/estoque":               "write",
    "/app/entrada":               "write",
    "/app/saida":                 "write",
    "/app/orcamento":             "write",
    "/app/imprimir-orcamento":    "write",
    "/app/pintura":               "write",
    "/app/pedido":                "write",
    "/app/etiquetagem":           "write",
    "/app/reposicao":             "write",
    "/app/produtos":              "write",
    "/app/veiculos":              "write",
    "/app/fornecedores":          "write",
    "/app/clientes":              "write",
    "/app/relatorios":            "write",
    "/app/configuracoes":         "write",
    "/app/transferencia":         "write",
    "/app/registro":              "write",
    "/app/usuarios":              "none",
  },
  // Atendimento (write) + Orçamento (somente leitura) + Clientes (leitura)
  ATENDENTE: {
    "/app":                       "read",
    "/app/agenda":                "write",
    "/app/agenda-consulta":       "write",
    "/app/atendimento":           "write",
    "/app/atendimento-consulta":  "write",
    "/app/estoque":               "none",
    "/app/entrada":               "none",
    "/app/saida":                 "none",
    "/app/orcamento":             "read",
    "/app/imprimir-orcamento":    "read",
    "/app/pintura":               "read",
    "/app/pedido":                "none",
    "/app/etiquetagem":           "none",
    "/app/reposicao":             "none",
    "/app/produtos":              "none",
    "/app/veiculos":              "none",
    "/app/fornecedores":          "none",
    "/app/clientes":              "read",
    "/app/relatorios":            "none",
    "/app/configuracoes":         "none",
    "/app/transferencia":         "none",
    "/app/registro":              "none",
    "/app/usuarios":              "none",
  },
  // Área de estoque completa (write), sem acesso a atendimento/orçamento
  ESTOQUISTA: {
    "/app":                       "read",
    "/app/agenda":                "write",
    "/app/agenda-consulta":       "write",
    "/app/atendimento":           "none",
    "/app/atendimento-consulta":  "none",
    "/app/estoque":               "write",
    "/app/entrada":               "write",
    "/app/saida":                 "write",
    "/app/orcamento":             "none",
    "/app/imprimir-orcamento":    "none",
    "/app/pintura":               "none",
    "/app/pedido":                "none",
    "/app/etiquetagem":           "write",
    "/app/reposicao":             "write",
    "/app/produtos":              "write",
    "/app/veiculos":              "none",
    "/app/fornecedores":          "none",
    "/app/clientes":              "none",
    "/app/relatorios":            "none",
    "/app/configuracoes":         "none",
    "/app/transferencia":         "write",
    "/app/registro":              "read",
    "/app/usuarios":              "none",
  },
};

export function getRolePermissions(role: UserRole): RolePermissionMap {
  return { ...DEFAULT_PERMISSIONS[role] };
}

// Permissões efetivas do usuário: padrão do perfil + ajustes individuais salvos em profiles.permissions.
// Administrador sempre tem acesso total (evita perder o acesso ao gerenciamento de usuários).
export function getUserPermissions(user: Pick<User, "role" | "permissions">): RolePermissionMap {
  if (user.role === "ADMIN") return getRolePermissions("ADMIN");
  return { ...getRolePermissions(user.role), ...(user.permissions ?? {}) };
}

export function getPagePermission(user: Pick<User, "role" | "permissions">, page: AppPage): PagePermission {
  return getUserPermissions(user)[page] ?? "none";
}

export function canAccessPage(user: Pick<User, "role" | "permissions">, page: AppPage): boolean {
  return getPagePermission(user, page) !== "none";
}

export function canEditPage(user: Pick<User, "role" | "permissions">, page: AppPage): boolean {
  return getPagePermission(user, page) === "write";
}
