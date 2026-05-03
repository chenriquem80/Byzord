import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { stockMovements, stores } from "@/data/mock-data";

export function RecordsPage() {
  const [movementType, setMovementType] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

  const filteredData = useMemo(
    () =>
      stockMovements.filter((item) => {
        const byType = movementType ? item.type === movementType : true;
        const byUser = userFilter ? item.user === userFilter : true;
        const byStore = storeFilter ? item.storeId === storeFilter : true;
        return byType && byUser && byStore;
      }),
    [movementType, storeFilter, userFilter],
  );

  const columns = useMemo<ColumnDef<(typeof stockMovements)[number]>[]>(
    () => [
      { accessorKey: "date", header: "Data" },
      { accessorKey: "storeName", header: "Loja" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "productCode", header: "Código" },
      { accessorKey: "productName", header: "Produto" },
      { accessorKey: "manufacturer", header: "Fabricante" },
      { accessorKey: "supplier", header: "Fornecedor" },
      { accessorKey: "quantity", header: "Quantidade" },
      { accessorKey: "user", header: "Usuário" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
            <SectionCard title="Filtros" description="Filtre por data, produto, usuário, tipo e fornecedor.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Input type="date" />
          <Input placeholder="Produto" />
          <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} placeholder="Loja">
            {stores.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Usuário">
            {[...new Set(stockMovements.map((item) => item.user))].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={movementType} onChange={(e) => setMovementType(e.target.value)} placeholder="Tipo movimentação">
            {[...new Set(stockMovements.map((item) => item.type))].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input placeholder="Fornecedor" />
        </div>
      </SectionCard>
      <SectionCard title="Histórico" description="Base pronta para paginação e auditoria detalhada.">
        <DataTable columns={columns} data={filteredData} />
      </SectionCard>
    </div>
  );
}

