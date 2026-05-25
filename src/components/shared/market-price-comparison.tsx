import { ExternalLink, Info, Search, ShoppingCart } from "lucide-react";

interface MarketPriceComparisonProps {
  productId: string;
  productName: string;
  productBrand: string;
  productImage?: string;
  salePrice: number;
  costPrice: number;
  searchQuery?: string;
}

export function MarketPriceComparison({ productName, searchQuery }: MarketPriceComparisonProps) {
  const query = (searchQuery?.trim() || productName).trim();
  const mlUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " preço")}&tbm=shop`;
  const olxUrl = `https://www.olx.com.br/brasil?q=${encodeURIComponent(query)}`;

  return (
    <div className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Comparação de mercado online</h3>
        <p className="text-sm text-slate-500">
          Pesquise <span className="font-semibold text-slate-700">"{query}"</span> nos principais marketplaces
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <a
          href={mlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 transition hover:bg-yellow-100"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-xs font-black text-slate-900">
            ML
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Mercado Livre</p>
            <p className="text-xs text-slate-500">Ver ofertas →</p>
          </div>
          <ExternalLink className="size-4 shrink-0 text-slate-400" />
        </a>

        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 transition hover:bg-blue-100"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
            <ShoppingCart className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Google Shopping</p>
            <p className="text-xs text-slate-500">Comparar preços →</p>
          </div>
          <ExternalLink className="size-4 shrink-0 text-slate-400" />
        </a>

        <a
          href={olxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 transition hover:bg-purple-100"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white">
            <Search className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">OLX</p>
            <p className="text-xs text-slate-500">Ver anúncios →</p>
          </div>
          <ExternalLink className="size-4 shrink-0 text-slate-400" />
        </a>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        <Info className="size-4 shrink-0" />
        <p>
          <strong>Aviso:</strong> Os links abrem uma busca ao vivo com os preços atuais de cada plataforma.
          Verifique frete, instalação, marca, condição e compatibilidade antes de decidir.
        </p>
      </div>
    </div>
  );
}
