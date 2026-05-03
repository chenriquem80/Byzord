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
  similarityScore: number;
  confidence: "exato" | "semelhante" | "baixa confiança";
}

interface MarketPriceComparisonProps {
  productId: string;
  productName: string;
  productBrand: string;
  productImage?: string;
  salePrice: number;
  costPrice: number;
}

export function MarketPriceComparison({
  productId,
  productName,
  productBrand,
  productImage,
  salePrice,
  costPrice,
}: MarketPriceComparisonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MarketResult[]>([]);
  const [cached, setCached] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const fetchMarketPrices = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      // In a real app, this would be an absolute URL or proxy
      const response = await fetch(`http://localhost:3001/api/market-prices/${productId}${force ? "?force=true" : ""}`);
      if (!response.ok) throw new Error("Erro ao buscar preços do mercado");
      
      const data = await response.json();
      setResults(data.results || []);
      setCached(data.cached);
      setLastUpdatedAt(data.queriedAt);
      setWarning(data.warning);
    } catch (err: any) {
      setError(err.message);
      // Fallback to mock if API is not running
      setResults([
        {
          title: `${productName} ${productBrand} (Simulado)`,
          store: "Loja Exemplo A",
          price: 489.90,
          url: "#",
          similarityScore: 0.92,
          confidence: "exato"
        },
        {
          title: `Vidro ${productBrand} referência premium (Simulado)`,
          store: "Loja Exemplo B",
          price: 505.00,
          url: "#",
          similarityScore: 0.84,
          confidence: "semelhante"
        },
        {
          title: `${productName} oferta marketplace (Simulado)`,
          store: "Marketplace C",
          price: 519.90,
          url: "#",
          similarityScore: 0.78,
          confidence: "semelhante"
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [productBrand, productId, productName]);

  useEffect(() => {
    if (productId) {
      fetchMarketPrices();
    }
  }, [productId, fetchMarketPrices]);

  const lowestMarketPrice = results.length > 0 ? Math.min(...results.map(r => r.price)) : 0;

  const isCompetitive = salePrice <= lowestMarketPrice * 1.1; // Within 10% of lowest
  const isAboveMarket = salePrice > lowestMarketPrice * 1.15; // More than 15% above
  const isLowMargin = salePrice > 0 && costPrice > 0 && (salePrice - costPrice) / salePrice < 0.2; // Less than 20% margin

  const displayResults = results.map((item, index) => ({
    ...item,
    image: productImage || "/placeholder.svg",
    installmentCount: item.price >= 1000 ? 10 : 8,
    installmentValue: item.price / (item.price >= 1000 ? 10 : 8),
    vendorCode: getStoreCode(item.store, index),
  }));

  return (
    <div className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Comparação de mercado online</h3>
          <p className="text-sm text-slate-500">Referências de preços públicos em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdatedAt && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <History className="size-3" />
              {new Date(lastUpdatedAt).toLocaleString("pt-BR")}
              {cached && <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 font-medium">Cache</span>}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchMarketPrices(true)}
            disabled={loading}
            className="rounded-full gap-2"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Consultando..." : "Atualizar consulta online"}
          </Button>
        </div>
      </div>

      {warning && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700 border border-amber-100">
          <AlertCircle className="size-4 shrink-0" />
          {warning}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">
          {error}. Usando dados de referência offline.
        </div>
      )}

      {/* Alert logic */}
      <div className="grid gap-3">
        {isAboveMarket && (
          <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100 text-rose-900">
            <div className="rounded-full bg-rose-200 p-2">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="font-bold">Seu preço está acima das menores referências encontradas.</p>
              <p className="text-sm opacity-80 font-medium">Menor preço no mercado: {formatCurrency(lowestMarketPrice)}</p>
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
                <TableHead>Loja</TableHead>
                <TableHead>Produto encontrado</TableHead>
                <TableHead>Correspondência</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
                <TableHead className="text-right">Abrir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayResults.map((item, index) => (
                <TableRow key={`${item.store}-${index}`} className="border-slate-200">
                  <TableCell className="min-w-[180px]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                        {item.vendorCode}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{item.store}</p>
                        <p className="text-xs text-slate-500">Referência online</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[320px]">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="size-16 shrink-0 rounded-2xl border border-slate-200 bg-slate-100 object-cover"
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

      <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        <Info className="size-4 shrink-0" />
        <p>
          <strong>Aviso:</strong> Preços online são apenas referência comercial. 
          Verifique frete, instalação, marca, condição e compatibilidade antes de decidir.
        </p>
      </div>
    </div>
  );
}

function getStoreCode(store: string, index: number) {
  const words = store.split(" ").filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
  return initials || `${index + 1}`;
}
