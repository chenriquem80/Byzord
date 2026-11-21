// Leitor do código de barras de boleto (ITF — Intercalado 2 de 5, 44 dígitos) a partir de uma imagem.
// Varre várias linhas (e colunas, para código na vertical) e só aceita leituras com
// dígito verificador válido.
import { parseBoleto } from "@/lib/boleto";

// N = estreita (0), W = larga (1)
const PATTERNS: Record<string, number> = {
  "00110": 0, "10001": 1, "01001": 2, "11000": 3, "00101": 4,
  "10100": 5, "01100": 6, "00011": 7, "10010": 8, "01010": 9,
};

const PAIRS = 22; // 44 dígitos

/** Classifica 5 larguras: as 2 maiores são largas. Retorna o dígito ou -1. */
function digitFrom(widths: number[]): number {
  const sorted = [...widths].sort((a, b) => a - b);
  const maxNarrow = sorted[2];
  const minWide = sorted[3];
  if (minWide < maxNarrow * 1.35) return -1;
  const threshold = (maxNarrow + minWide) / 2;
  const key = widths.map((w) => (w > threshold ? "1" : "0")).join("");
  return PATTERNS[key] ?? -1;
}

/** Tenta decodificar a partir das larguras alternadas (barra, espaço, barra...). */
function decodeRuns(runs: number[], firstIsBar: boolean): string | null {
  // índice das barras: se a sequência começa com espaço, as barras ficam nos ímpares
  const barOffset = firstIsBar ? 0 : 1;
  for (let i = barOffset; i + 4 + PAIRS * 10 + 3 <= runs.length; i += 2) {
    // início: barra, espaço, barra, espaço — todos estreitos e parecidos
    const start = runs.slice(i, i + 4);
    const narrow = start.reduce((s, v) => s + v, 0) / 4;
    if (start.some((w) => w > narrow * 1.6 || w < narrow * 0.4)) continue;
    // zona de silêncio antes do início (espaço claro bem mais largo)
    if (i > 0 && runs[i - 1] < narrow * 4) continue;

    let digits = "";
    let p = i + 4;
    let ok = true;
    for (let k = 0; k < PAIRS; k++) {
      const chunk = runs.slice(p, p + 10);
      const bars = [chunk[0], chunk[2], chunk[4], chunk[6], chunk[8]];
      const spaces = [chunk[1], chunk[3], chunk[5], chunk[7], chunk[9]];
      const d1 = digitFrom(bars);
      const d2 = digitFrom(spaces);
      if (d1 < 0 || d2 < 0) { ok = false; break; }
      digits += `${d1}${d2}`;
      p += 10;
    }
    if (!ok) continue;
    // fim: barra larga, espaço estreito, barra estreita
    const [eb, es, en] = runs.slice(p, p + 3);
    if (!(eb > es * 1.35 && eb > en * 1.35)) continue;
    const info = parseBoleto(digits);
    if (info?.valid) return info.barcode;
  }
  return null;
}

/** Larguras das faixas claras/escuras de uma linha de luminância. */
function runsOf(line: Float32Array): { runs: number[]; firstIsBar: boolean } | null {
  const n = line.length;
  // limiar adaptativo: média local (janela ~1/16 da linha) misturada com o meio entre os extremos
  const sorted = Array.from(line).sort((a, b) => a - b);
  const lo = sorted[Math.floor(n * 0.05)];
  const hi = sorted[Math.floor(n * 0.95)];
  if (hi - lo < 40) return null; // pouco contraste
  const global = (lo + hi) / 2;
  const win = Math.max(8, Math.floor(n / 16));
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + line[i];

  const runs: number[] = [];
  let firstIsBar = false;
  let current: boolean | null = null;
  let length = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - win);
    const b = Math.min(n, i + win);
    const local = (prefix[b] - prefix[a]) / (b - a);
    const dark = line[i] < (local + global) / 2;
    if (current === null) { current = dark; firstIsBar = dark; length = 1; continue; }
    if (dark === current) { length++; continue; }
    runs.push(length);
    current = dark;
    length = 1;
  }
  runs.push(length);
  return { runs, firstIsBar };
}

function tryLine(line: Float32Array): string | null {
  const r = runsOf(line);
  if (!r || r.runs.length < PAIRS * 10 + 7) return null;
  const forward = decodeRuns(r.runs, r.firstIsBar);
  if (forward) return forward;
  // código de cabeça para baixo: lê a linha ao contrário
  const lastIsBar = r.runs.length % 2 === 1 ? r.firstIsBar : !r.firstIsBar;
  return decodeRuns([...r.runs].reverse(), lastIsBar);
}

/** Procura o código do boleto na imagem. Retorna os 44 dígitos ou null. */
export function decodeBoletoFromImageData(img: ImageData, lines = 24): string | null {
  const { width, height, data } = img;
  const lum = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    return data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  };
  // linhas horizontais (código deitado), do centro para fora
  const rowLine = new Float32Array(width);
  for (let k = 0; k < lines; k++) {
    const offset = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
    const y = Math.floor(height / 2 + (offset * height * 0.8) / lines);
    if (y < 0 || y >= height) continue;
    for (let x = 0; x < width; x++) rowLine[x] = lum(x, y);
    const found = tryLine(rowLine);
    if (found) return found;
  }
  // colunas (código em pé)
  const colLine = new Float32Array(height);
  for (let k = 0; k < lines; k++) {
    const offset = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
    const x = Math.floor(width / 2 + (offset * width * 0.8) / lines);
    if (x < 0 || x >= width) continue;
    for (let y = 0; y < height; y++) colLine[y] = lum(x, y);
    const found = tryLine(colLine);
    if (found) return found;
  }
  return null;
}

/** Lê o código do boleto de uma foto (arquivo da câmera/galeria). */
export async function decodeBoletoFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    // tenta em tamanhos diferentes: grande (detalhe) e médio (menos ruído)
    for (const maxSide of [3200, 2000, 1400]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const found = decodeBoletoFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), 60);
      if (found) return found;
    }
    return null;
  } finally {
    bitmap.close();
  }
}
