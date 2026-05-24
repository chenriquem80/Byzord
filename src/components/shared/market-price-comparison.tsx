import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface MarketResult {
  title: string;
  store: string;
  price: number;
  url: string;
  thumbnail: string;
  similarityScore: number;
  confidence: "exato" | "semelhante" | "baixa confiança";
  installmentCount: number;
  installmentValue: number;
}

interface MarketPriceComparisonProps {
  productId: string;
  productName: string;
  productBrand: string;
  productImage?: string;
  salePrice: number;
  costPrice: number;
  searchQuery?: string;
}

function calcSimilarity(mlTitle: string, productName: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const productWords = normalize(productName);
  const titleWords = normalize(mlTitle);
  if (productWords.length === 0) return 0;
  const matched = productWords.filter((w) => titleWords.includes(w)).length;
  return matched / productWords.length;
}

export function MarketPriceComparison({
  productName,
  productBrand,
  productImage,
  salePrice,
  costPrice,
  searchQuery,
}: MarketPriceComparisonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MarketResult[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const fetchMarketPrices = useCallback(async () => {
    const rawQuery = searchQuery?.trim() || `${productName} ${productBrand}`.trim();
    if (!rawQuery) return;
    setLoading(true);
    setError(null);

    try {
      const query = encodeURIComponent(rawQuery);
      const url = `https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=6&sort=price_asc`;
      const response = await fetch(url);

      if (!response.ok) throw new Error(`Erro ${response.status} ao consultar o Mercado Livre`);

      const data = await response.json();

      const mapped: MarketResult[] = (data.results ?? [])
        .filter((item: any) => item.price > 0)
        .slice(0, 5)
        .map((item: any) => {
          const similarity = calcSimilarity(item.title, productName);
          const confidence: MarketResult["confidence"] =
            similarity >= 0.75 ? "exato" : similarity >= 0.4 ? "semelhante" : "baixa confiança";
          const installCount = item.installments?.quantity ?? (item.price >= 1000 ? 10 : 8);
          const installValue = item.installments?.amount ?? item.price / installCount;
          return {
            title: item.title,
            store: item.seller?.nickname ?? "Vendedor ML",
            price: item.price,
            url: item.permalink,
            thumbnail: item.thumbnail?.replace("http://", "https://") ?? "",
            similarityScore: similarity,
            confidence,
            installmentCount: installCount,
            installmentValue: installValue,
          };
        });

      setResults(mapped);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err.message ?? "Erro ao consultar o Mercado Livre");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, productName, productBrand]);

  useEffect(() => {
    fetchMarketPrices();
  }, [fetchMarketPrices]);

  const lowestMarketPrice = results.length > 0 ? Math.min(...results.map((r) => r.price)) : 0;
  const isCompetitive = lowestMarketPrice > 0 && salePrice <= lowestMarketPrice * 1.1;
  const isAboveMarket = lowestMarketPrice > 0 && salePrice > lowestMarketPrice * 1.15;
  const isLowMargin = salePrice > 0 && costPrice > 0 && (salePrice - costPrice) / salePrice < 0.2;

  return (
    <div className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Comparação de mercado online</h3>
          <p className="text-sm text-slate-500">Resultados reais do Mercado Livre em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdatedAt && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <History className="size-3" />
              {new Date(lastUpdatedAt).toLocaleString("pt-BR")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMarketPrices}
            disabled={loading}
            className="rounded-full gap-2"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Consultando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          Nenhum resultado encontrado no Mercado Livre para este produto.
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 animate-pulse">
          Buscando preços no Mercado Livre...
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid gap-3">
            {isAboveMarket && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100 text-rose-900">
                <div className="rounded-full bg-rose-200 p-2">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="font-bold">Seu preço está acima das menores referências encontradas.</p>
                  <p className="text-sm opacity-80 font-medium">Menor preço no Mercado Livre: {formatCurrency(lowestMarketPrice)}</p>
                </div>
              </div>
            )}
            {isCompetitive && !isAboveMarket && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-100 text-emerald-900">
                <div className="rounded-full bg-emerald-200 p-2">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="font-bold">Preço competitivo em relação ao mercado.</p>
                  <p className="text-sm opacity-80 font-medium">Você está dentro da faixa de preço das melhores ofertas.</p>
                </div>
              </div>
            )}
            {isLowMargin && (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-100 text-amber-900">
                <div className="rounded-full bg-amber-200 p-2">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="font-bold">Atenção: preço competitivo, mas margem baixa.</p>
                  <p className="text-sm opacity-80 font-medium">Verifique se o desconto aplicado não compromete a operação.</p>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <Table className="min-w-[860px] bg-white">
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Produto encontrado</TableHead>
                    <TableHead>Correspondência</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Parcela</TableHead>
                    <TableHead className="text-right">Abrir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((item, index) => (
                    <TableRow key={index} className="border-slate-200">
                      <TableCell className="min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-xs font-bold text-slate-900">
                            ML
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 max-w-[130px]" title={item.store}>
                              {item.store}
                            </p>
                            <p className="text-xs text-slate-500">Mercado Livre</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[320px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.thumbnail || productImage || "/placeholder.svg"}
                            alt={item.title}
                            className="size-16 shrink-0 rounded-2xl border border-slate-200 bg-slate-100 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-semibold text-slate-900" title={item.title}>
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{productName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border-transparent text-[10px] font-bold uppercase",
                            item.confidence === "exato" && "bg-emerald-100 text-emerald-800",
                            item.confidence === "semelhante" && "bg-blue-100 text-blue-800",
                            item.confidence === "baixa confiança" && "bg-slate-200 text-slate-700",
                          )}
                        >
                          {item.confidence}
                        </Badge>
                        <p className="mt-2 text-xs text-slate-500">
                          Similaridade: {Math.round(item.similarityScore * 100)}%
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-lg font-black text-slate-950">{formatCurrency(item.price)}</p>
                        <p className="text-xs text-slate-500">valor atual</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(item.installmentValue)}/mês
                        </p>
                        <p className="text-xs text-slate-500">em {item.installmentCount}x</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full bg-slate-50 p-2 text-primary shadow-sm ring-1 ring-slate-200 transition hover:bg-primary hover:text-white"
                          aria-label={`Abrir oferta de ${item.store}`}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        <Info className="size-4 shrink-0" />
        <p>
          <strong>Aviso:</strong> Preços são buscados em tempo real no Mercado Livre e servem apenas como referência comercial.
          Verifique frete, instalação, marca, condição e compatibilidade antes de decidir.
        </p>
      </div>
    </div>
  );
}
