import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { suppliers } from "@/data/mock-data";
import { formatMonthYear } from "@/lib/format";

export function SuppliersPage() {
  const columns = useMemo<ColumnDef<(typeof suppliers)[number]>[]>(
    () => [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "cnpj", header: "CNPJ" },
      { accessorKey: "contact", header: "Contato" },
      { accessorKey: "whatsapp", header: "WhatsApp" },
      { accessorKey: "email", header: "E-mail" },
      {
        accessorKey: "suppliedProducts",
        header: "Produtos fornecidos",
        cell: ({ row }) => row.original.suppliedProducts.join(", "),
      },
      {
        accessorKey: "lastPurchaseDate",
        header: "Última compra",
        cell: ({ row }) => formatMonthYear(row.original.lastPurchaseDate),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
            <SectionCard title="Base de fornecedores" description="Pronta para integração com pedidos e histórico de custo.">
        <DataTable columns={columns} data={suppliers} />
      </SectionCard>
    </div>
  );
}

