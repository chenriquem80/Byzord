import type { VehicleCompatibility } from "@/types/domain";

type CompatLike = Pick<VehicleCompatibility, "automaker" | "model" | "startYear" | "endYear"> &
  Partial<Pick<VehicleCompatibility, "generation" | "version">>;

const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");

/** Chave do veículo: montadora + modelo + geração + anos + versão (sem diferenciar maiúsculas/espaços). */
export function compatKey(c: CompatLike): string {
  return [c.automaker, c.model, c.generation, c.startYear || 0, c.endYear || 0, c.version].map(norm).join("|");
}

/** Remove veículos repetidos mantendo a primeira ocorrência. */
export function dedupeCompatibilities<T extends CompatLike>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = compatKey(c);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
