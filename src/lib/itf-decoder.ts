// Leitor do código de barras de boleto (ITF — Intercalado 2 de 5, 44 dígitos) a partir de uma imagem.
// Mede as barras com precisão abaixo do pixel (bordas interpoladas) e soma várias linhas vizinhas
// para reduzir ruído — assim lê mesmo com o código pequeno no quadro da câmera.
// Só aceita leituras com dígito verificador válido.
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
  if (minWide < maxNarrow * 1.3) return -1;
  const threshold = (maxNarrow + minWide) / 2;
  let key = "";
  for (const w of widths) key += w > threshold ? "1" : "0";
  return PATTERNS[key] ?? -1;
}

/** Tenta decodificar a partir das larguras alternadas, com a barra no índice barOffset. */
function decodeRuns(runs: number[], barOffset: number): string | null {
  for (let i = barOffset; i + 4 + PAIRS * 10 + 3 <= runs.length; i += 2) {
    // início: barra, espaço, barra, espaço — todos estreitos e parecidos
    const narrow = (runs[i] + runs[i + 1] + runs[i + 2] + runs[i + 3]) / 4;
    let bad = false;
    for (let k = 0; k < 4; k++) if (runs[i + k] > narrow * 1.7 || runs[i + k] < narrow * 0.35) bad = true;
    if (bad) continue;
    // zona de silêncio antes do início
    if (i > 0 && runs[i - 1] < narrow * 3) continue;

    let digits = "";
    let p = i + 4;
    let ok = true;
    for (let k = 0; k < PAIRS; k++) {
      const d1 = digitFrom([runs[p], runs[p + 2], runs[p + 4], runs[p + 6], runs[p + 8]]);
      const d2 = digitFrom([runs[p + 1], runs[p + 3], runs[p + 5], runs[p + 7], runs[p + 9]]);
      if (d1 < 0 || d2 < 0) { ok = false; break; }
      digits += `${d1}${d2}`;
      p += 10;
    }
    if (!ok) continue;
    // fim: barra larga, espaço estreito, barra estreita
    if (!(runs[p] > runs[p + 1] * 1.3 && runs[p] > runs[p + 2] * 1.3)) continue;
    const info = parseBoleto(digits);
    if (info?.valid) return info.barcode;
  }
  return null;
}

/**
 * Larguras (fracionárias) das faixas claras/escuras de uma linha de luminância.
 * Bordas localizadas por interpolação linear no cruzamento do limiar adaptativo.
 */
function runsOf(line: Float32Array): { runs: number[]; firstIsBar: boolean } | null {
  const n = line.length;
  if (n < 50) return null;

  const sorted = Array.from(line).sort((a, b) => a - b);
  const lo = sorted[Math.floor(n * 0.05)];
  const hi = sorted[Math.floor(n * 0.95)];
  if (hi - lo < 30) return null; // pouco contraste
  const global = (lo + hi) / 2;
  const win = Math.max(8, Math.floor(n / 20));
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + line[i];

  const diff = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - win);
    const b = Math.min(n, i + win);
    const local = (prefix[b] - prefix[a]) / (b - a);
    diff[i] = line[i] - (local + global) / 2; // < 0 = escuro
  }

  const edges: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    if ((diff[i] < 0) !== (diff[i + 1] < 0)) {
      const t = diff[i] / (diff[i] - diff[i + 1]);
      edges.push(i + t);
    }
  }
  if (edges.length < PAIRS * 10 + 7) return null;
  const runs: number[] = [edges[0]];
  for (let k = 1; k < edges.length; k++) runs.push(edges[k] - edges[k - 1]);
  runs.push(n - edges[edges.length - 1]);
  return { runs, firstIsBar: diff[0] < 0 };
}

/**
 * Bordas pelos picos do gradiente (resiste melhor a imagem levemente desfocada, em que as
 * faixas estreitas não chegam a cruzar o limiar). Posição refinada por ajuste de parábola.
 */
function gradientRunsOf(line: Float32Array): { runs: number[]; firstIsBar: boolean } | null {
  const n = line.length;
  if (n < 50) return null;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { if (line[i] < lo) lo = line[i]; if (line[i] > hi) hi = line[i]; }
  if (hi - lo < 30) return null;
  const g = new Float32Array(n);
  for (let i = 1; i < n - 1; i++) g[i] = line[i + 1] - line[i - 1];
  const minGrad = (hi - lo) * 0.08;

  const edges: { pos: number; sign: number; mag: number }[] = [];
  for (let i = 2; i < n - 2; i++) {
    const m = Math.abs(g[i]);
    if (m < minGrad || m < Math.abs(g[i - 1]) || m <= Math.abs(g[i + 1])) continue;
    const a = Math.abs(g[i - 1]), c = Math.abs(g[i + 1]);
    const den = a - 2 * m + c;
    const offset = den !== 0 ? (a - c) / (2 * den) : 0;
    const e = { pos: i + offset, sign: Math.sign(g[i]), mag: m };
    const last = edges[edges.length - 1];
    // bordas precisam alternar (escurece, clareia, escurece...): mesma direção → fica a mais forte
    if (last && last.sign === e.sign) { if (e.mag > last.mag) edges[edges.length - 1] = e; continue; }
    edges.push(e);
  }
  if (edges.length < PAIRS * 10 + 7) return null;
  const runs: number[] = [edges[0].pos];
  for (let k = 1; k < edges.length; k++) runs.push(edges[k].pos - edges[k - 1].pos);
  runs.push(n - edges[edges.length - 1].pos);
  // primeira borda escurecendo (gradiente negativo) → antes dela é claro
  return { runs, firstIsBar: edges[0].sign > 0 };
}

function tryRuns(r: { runs: number[]; firstIsBar: boolean } | null): string | null {
  if (!r) return null;
  const forward = decodeRuns(r.runs, r.firstIsBar ? 0 : 1);
  if (forward) return forward;
  // código de cabeça para baixo: lê a linha ao contrário
  const lastIsBar = (r.runs.length % 2 === 1) === r.firstIsBar;
  return decodeRuns([...r.runs].reverse(), lastIsBar ? 0 : 1);
}

function tryLine(line: Float32Array): string | null {
  return tryRuns(runsOf(line)) ?? tryRuns(gradientRunsOf(line));
}

export type DecodeOptions = {
  /** Quantas linhas varrer (do centro para fora) */
  lines?: number;
  /** Faixa da imagem varrida, em fração da altura/largura (1 = tudo) */
  span?: number;
  /** Também procura o código em pé (colunas) */
  columns?: boolean;
  /** Linhas vizinhas somadas para reduzir ruído */
  band?: number;
};

/** Procura o código do boleto na imagem. Retorna os 44 dígitos ou null. */
export function decodeBoletoFromImageData(img: ImageData, opts: DecodeOptions = {}): string | null {
  const { lines = 24, span = 0.8, columns = true, band = 3 } = opts;
  const { width, height, data } = img;
  const lum = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    return data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  };
  const half = Math.floor(band / 2);

  // linhas horizontais (código deitado), do centro para fora
  const rowLine = new Float32Array(width);
  for (let k = 0; k < lines; k++) {
    const offset = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
    const y = Math.floor(height / 2 + (offset * height * span) / lines);
    if (y - half < 0 || y + half >= height) continue;
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let dy = -half; dy <= half; dy++) s += lum(x, y + dy);
      rowLine[x] = s / band;
    }
    const found = tryLine(rowLine);
    if (found) return found;
  }
  if (!columns) return null;
  // colunas (código em pé)
  const colLine = new Float32Array(height);
  for (let k = 0; k < lines; k++) {
    const offset = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
    const x = Math.floor(width / 2 + (offset * width * span) / lines);
    if (x - half < 0 || x + half >= width) continue;
    for (let y = 0; y < height; y++) {
      let s = 0;
      for (let dx = -half; dx <= half; dx++) s += lum(x + dx, y);
      colLine[y] = s / band;
    }
    const found = tryLine(colLine);
    if (found) return found;
  }
  return null;
}

/**
 * Leitura contínua da câmera: recorta a faixa central do quadro (onde fica a marcação)
 * e varre as linhas. Pensado para rodar várias vezes por segundo.
 */
export function decodeBoletoFromVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  // faixa central: largura toda, 40% da altura
  const bandH = Math.round(vh * 0.4);
  canvas.width = vw;
  canvas.height = bandH;
  ctx.drawImage(video, 0, Math.round((vh - bandH) / 2), vw, bandH, 0, 0, vw, bandH);
  const found = decodeBoletoFromImageData(ctx.getImageData(0, 0, vw, bandH), { lines: 16, span: 0.9, columns: false, band: 5 });
  if (found) return found;
  // código em pé (celular deitado com vídeo em retrato): faixa vertical central
  const bandW = Math.round(vw * 0.4);
  canvas.width = bandW;
  canvas.height = vh;
  ctx.drawImage(video, Math.round((vw - bandW) / 2), 0, bandW, vh, 0, 0, bandW, vh);
  const img = ctx.getImageData(0, 0, bandW, vh);
  return decodeBoletoFromImageData(img, { lines: 10, span: 0.9, band: 5, columns: true });
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
      const found = decodeBoletoFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), { lines: 60 });
      if (found) return found;
    }
    return null;
  } finally {
    bitmap.close();
  }
}
