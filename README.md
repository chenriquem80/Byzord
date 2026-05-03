# Auto Vitrais

Sistema web responsivo em React para controle de estoque, balcão, reposição e cadastro de uma loja de vidros automotivos.

## Stack

- React + TypeScript + Vite
- TailwindCSS
- Componentes no estilo Shadcn UI
- React Router
- TanStack Table
- React Hook Form + Zod
- Estrutura pronta para Supabase/PostgreSQL

## Rodando

```bash
npm install
npm run dev
```

## Banco

- Arquivo de schema inicial: `supabase/schema.sql`
- Variáveis de ambiente exemplo: `.env.example`

## Cobertura da interface

- Home com cards grandes e alertas
- Estoque com busca rápida, filtros e modal por produto
- Produtos com cadastro em abas
- Entrada, saída, registro, pedido, etiquetagem e reposição
- Clientes, fornecedores, veículos, relatórios e configurações
