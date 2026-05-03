import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { customers } from "@/data/mock-data";

export function CustomersPage() {
  const columns = useMemo<ColumnDef<(typeof customers)[number]>[]>(
    () => [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "phone", header: "Telefone" },
      { accessorKey: "whatsapp", header: "WhatsApp" },
      { accessorKey: "email", header: "E-mail" },
      { accessorKey: "document", header: "CPF/CNPJ" },
      { accessorKey: "plate", header: "Placa" },
      { accessorKey: "vehicleModel", header: "Veículo" },
      { accessorKey: "purchaseCount", header: "Compras" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
            <SectionCard title="Base de clientes" description="Pronta para histórico de compras e relacionamento.">
        <DataTable columns={columns} data={customers} />
      </SectionCard>
    </div>
  );
}

