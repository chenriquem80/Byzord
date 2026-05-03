import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { Input } from "@/components/ui/input";
import { products } from "@/data/mock-data";

interface VehicleRow {
  vehicle: string;
  range: string;
  product: string;
  type: string;
  feature: string;
}

export function VehiclesPage() {
  const [search, setSearch] = useState("Gol 2015");

  const rows = useMemo<VehicleRow[]>(() => {
    return products.flatMap((product) =>
      product.compatibilities
        .filter((item) => {
          const text = `${item.automaker} ${item.model} ${item.generation} ${item.startYear} ${item.endYear}`.toLowerCase();
          return search ? text.includes(search.toLowerCase()) : true;
        })
        .map((item) => ({
          vehicle: `${item.automaker} ${item.model} ${item.generation}`,
          range: `${item.startYear} a ${item.endYear}`,
          product: product.name,
          type: product.glassType,
          feature: product.feature,
        })),
    );
  }, [search]);

  const columns = useMemo<ColumnDef<VehicleRow>[]>(
    () => [
      { accessorKey: "vehicle", header: "Veículo" },
      { accessorKey: "range", header: "Ano" },
      { accessorKey: "product", header: "Vidro compatível" },
      { accessorKey: "type", header: "Tipo" },
      { accessorKey: "feature", header: "Característica" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
            <SectionCard title="Busca inversa" description="Exemplo: pesquise Gol 2015 para listar compatibilidades.">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Gol 2015" />
      </SectionCard>
      <SectionCard title="Compatibilidades encontradas" description="Estrutura pronta para manutenção da base veicular.">
        <DataTable columns={columns} data={rows} />
      </SectionCard>
    </div>
  );
}

