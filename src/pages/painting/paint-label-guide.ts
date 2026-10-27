// Onde costuma ficar a etiqueta com o código da tinta, por marca.
// Os locais podem variar conforme modelo e ano — serve como ponto de partida.
export type PaintLabelGuide = {
  brand: string;
  // Nomes como a NHTSA devolve no campo Make, para seleção automática
  aliases: string[];
  locations: string[];
  codeFormat: string;
};

export const PAINT_LABEL_GUIDES: PaintLabelGuide[] = [
  {
    brand: "Volkswagen",
    aliases: ["VOLKSWAGEN", "VW"],
    locations: [
      "Etiqueta de dados do veículo no assoalho do porta-malas, perto do estepe",
      "Primeira página do manual / plano de manutenção",
    ],
    codeFormat: "4 caracteres (ex.: LB9A) ou 2 caracteres (ex.: 2T)",
  },
  {
    brand: "Fiat",
    aliases: ["FIAT"],
    locations: [
      "Etiqueta no compartimento do motor (torre da suspensão ou longarina)",
      "Parte interna da tampa do porta-malas",
    ],
    codeFormat: "3 dígitos, às vezes com letra (ex.: 268, 632/A)",
  },
  {
    brand: "Chevrolet",
    aliases: ["CHEVROLET", "GM", "GENERAL MOTORS"],
    locations: [
      "Etiqueta de identificação de peças no porta-luvas",
      "Coluna da porta do motorista ou perto do estepe",
    ],
    codeFormat: "3 caracteres ou iniciado por WA / U (ex.: GAZ, WA8555)",
  },
  {
    brand: "Ford",
    aliases: ["FORD"],
    locations: ["Etiqueta na coluna da porta do motorista, campo EXT PNT / PAINT"],
    codeFormat: "2 caracteres (ex.: YZ, UX)",
  },
  {
    brand: "Toyota",
    aliases: ["TOYOTA"],
    locations: ["Etiqueta na coluna da porta do motorista, campo C/TR (o código vem antes da barra)"],
    codeFormat: "3 caracteres (ex.: 040, 1F7)",
  },
  {
    brand: "Honda",
    aliases: ["HONDA"],
    locations: ["Plaqueta na coluna da porta do motorista", "Etiqueta no cofre do motor"],
    codeFormat: "Letras + números (ex.: NH-731P, B-593M)",
  },
  {
    brand: "Hyundai",
    aliases: ["HYUNDAI"],
    locations: ["Etiqueta na coluna da porta do motorista, campo PAINT / EXT"],
    codeFormat: "2 a 3 caracteres (ex.: PGU, YP5)",
  },
  {
    brand: "Renault",
    aliases: ["RENAULT"],
    locations: ["Etiqueta na coluna da porta do motorista", "Etiqueta no cofre do motor"],
    codeFormat: "Letras + números (ex.: NV676, TEKNG)",
  },
  {
    brand: "Nissan",
    aliases: ["NISSAN"],
    locations: ["Etiqueta no cofre do motor", "Coluna da porta do motorista, campo COLOR"],
    codeFormat: "3 caracteres (ex.: KAD, QAB)",
  },
  {
    brand: "Peugeot / Citroën",
    aliases: ["PEUGEOT", "CITROEN", "CITROËN"],
    locations: ["Etiqueta na coluna da porta", "Etiqueta no cofre do motor"],
    codeFormat: "3 a 5 caracteres (ex.: EWP, KTV)",
  },
  {
    brand: "Jeep",
    aliases: ["JEEP"],
    locations: ["Etiqueta na coluna da porta do motorista"],
    codeFormat: "Iniciado por P (ex.: PW7, PXR)",
  },
  {
    brand: "Mitsubishi",
    aliases: ["MITSUBISHI"],
    locations: ["Plaqueta no cofre do motor"],
    codeFormat: "Letra + números (ex.: W37, U17)",
  },
];

export function findGuideByMake(make: string | undefined): PaintLabelGuide | undefined {
  if (!make) return undefined;
  const upper = make.toUpperCase();
  return PAINT_LABEL_GUIDES.find((g) => g.aliases.some((a) => upper.includes(a)));
}
