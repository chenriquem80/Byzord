type ItemLike = { name?: string | null; glassType?: string | null; feature?: string | null };

/** Compara textos sem diferenciar maiúsculas nem espaços sobrando ("PALIO " = "PALIO"). */
export const normText = (v?: string | null) => (v ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");

/** Mesmo item (nome, tipo e característica), ainda que cadastrado mais de uma vez. */
export function isSameItem(a: ItemLike, b: ItemLike): boolean {
  return normText(a.name) === normText(b.name)
    && normText(a.glassType) === normText(b.glassType)
    && normText(a.feature) === normText(b.feature);
}
