// Leitura de boletos: código de barras (44 dígitos) ou linha digitável (47 bancário / 48 arrecadação).
// Extrai valor e vencimento (o vencimento só existe no boleto bancário).

export type BoletoInfo = {
  /** Código de barras com 44 dígitos */
  barcode: string;
  /** "bancario" (bancos) ou "arrecadacao" (concessionárias, tributos — começa com 8) */
  type: "bancario" | "arrecadacao";
  amount: number | null;
  /** AAAA-MM-DD; null quando o boleto não informa */
  dueDate: string | null;
  /** Dígito verificador confere */
  valid: boolean;
};

const DAY_MS = 86_400_000;

function isoUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Fator de vencimento (4 dígitos). A contagem começou em 07/10/1997 e reiniciou em 1000
 * no dia 22/02/2025; escolhe a data mais próxima de hoje entre os dois ciclos.
 */
function dueDateFromFactor(factor: number): string | null {
  if (!factor) return null;
  const oldBase = Date.UTC(1997, 9, 7);
  const newBase = Date.UTC(2022, 4, 29); // 22/02/2025 - 1000 dias
  const candidates = [oldBase + factor * DAY_MS, newBase + factor * DAY_MS];
  const now = Date.now();
  candidates.sort((a, b) => Math.abs(a - now) - Math.abs(b - now));
  return isoUtc(candidates[0]);
}

function mod11Bank(digits43: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits43.length - 1; i >= 0; i--) {
    sum += Number(digits43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const r = 11 - (sum % 11);
  return r === 0 || r === 10 || r === 11 ? 1 : r;
}

function mod10(digits: string): number {
  let sum = 0;
  let mult = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    let p = Number(digits[i]) * mult;
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    sum += p;
    mult = mult === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}

function mod11Collection(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const r = sum % 11;
  return r === 0 || r === 1 ? 0 : 11 - r;
}

/** Converte linha digitável (47/48) em código de barras (44). Retorna null se o tamanho não bate. */
function toBarcode(digits: string): string | null {
  if (digits.length === 44) return digits;
  if (digits.length === 47) {
    // AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
    return digits.slice(0, 4) + digits[32] + digits.slice(33, 47) + digits.slice(4, 9) + digits.slice(10, 20) + digits.slice(21, 31);
  }
  if (digits.length === 48) {
    // 4 blocos de 11 dígitos + 1 verificador cada
    return digits.slice(0, 11) + digits.slice(12, 23) + digits.slice(24, 35) + digits.slice(36, 47);
  }
  return null;
}

export function parseBoleto(raw: string): BoletoInfo | null {
  const digits = raw.replace(/\D/g, "");
  const barcode = toBarcode(digits);
  if (!barcode) return null;

  if (barcode[0] === "8") {
    // Arrecadação: 3º dígito 6/7 = valor efetivo em reais; 8/9 = referência (sem valor)
    const valueId = barcode[2];
    const amount = valueId === "6" || valueId === "7" ? Number(barcode.slice(4, 15)) / 100 : null;
    const body = barcode.slice(0, 3) + barcode.slice(4);
    const dv = valueId === "6" || valueId === "7" ? mod10(body) : mod11Collection(body);
    return { barcode, type: "arrecadacao", amount, dueDate: null, valid: dv === Number(barcode[3]) };
  }

  const factor = Number(barcode.slice(5, 9));
  const amount = Number(barcode.slice(9, 19)) / 100;
  const dv = mod11Bank(barcode.slice(0, 4) + barcode.slice(5));
  return {
    barcode,
    type: "bancario",
    amount: amount > 0 ? amount : null,
    dueDate: dueDateFromFactor(factor),
    valid: dv === Number(barcode[4]),
  };
}
