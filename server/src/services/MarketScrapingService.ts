import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export interface MarketResult {
  title: string;
  store: string;
  price: number;
  url: string;
  similarityScore: number;
  confidence: "exato" | "semelhante" | "baixa confiança";
}

export class MarketScrapingService {
  /**
   * Build an optimized search term for the product
   */
  static buildSearchTerm(product: any): string {
    const { name, glassType, feature, brand, compatibilities } = product;
    const compatibility = compatibilities?.[0];
    const yearRange = compatibility ? `${compatibility.startYear} ${compatibility.endYear}` : "";
    const model = compatibility?.model || "";
    const generation = compatibility?.generation || "";

    // Example: "parabrisa gol g5 2008 2011 degrade preço"
    return `${glassType} ${brand} ${model} ${generation} ${yearRange} ${feature} preço`.replace(/\s+/g, " ").trim();
  }

  /**
   * Main function to search for market prices
   */
  static async searchMarketPrices(productId: string, forceUpdate: boolean = false) {
    // 1. Check cache
    if (!forceUpdate) {
      const cached = await this.getCachedMarketPrices(productId);
      if (cached) return { ...cached, cached: true };
    } else {
      // Limit forced updates to 1 per 30 minutes
      const lastUpdate = await this.getLastUpdateTime(productId);
      if (lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < 30 * 60 * 1000) {
        const cached = await this.getCachedMarketPrices(productId);
        if (cached) return { ...cached, cached: true, warning: "Limite de atualização atingido (30 min)." };
      }
    }

    // 2. Mocking or Real Scraping
    try {
      const productData = await this.getProductById(productId);
      if (!productData) throw new Error("Produto não encontrado");

      const searchTerm = this.buildSearchTerm(productData);
      const rawResults = await this.scrapeSearchResults(searchTerm);
      const normalizedResults = this.normalizeResults(rawResults, productData);
      const top3 = this.getTop3LowestPrices(normalizedResults);

      // 3. Save to cache and history
      await this.saveMarketPriceHistory(productId, searchTerm, top3);
      await this.saveToCache(productId, searchTerm, top3);

      return {
        productId,
        searchTerm,
        cached: false,
        queriedAt: new Date().toISOString(),
        results: top3
      };
    } catch (error) {
      console.error("Scraping error:", error);
      // Return last cache if failed
      const cached = await this.getCachedMarketPrices(productId);
      return { 
        ...cached, 
        cached: true, 
        warning: "Falha na consulta em tempo real. Exibindo último cache disponível." 
      };
    }
  }

  /**
   * Responsible scraping using Playwright (Mocked for now as requested)
   */
  private static async scrapeSearchResults(searchTerm: string): Promise<any[]> {
    // This is where real scraping logic would go, respecting robots.txt and terms.
    // For now, we return mock results to simulate the API.
    
    console.log(`Simulating scraping for: ${searchTerm}`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return [
      {
        title: `${searchTerm.replace(" preço", "")} Original`,
        store: "Mercado Peças A",
        price: "R$ 489,90",
        url: "https://example.com/p1"
      },
      {
        title: `Vidro ${searchTerm.replace(" preço", "")}`,
        store: "AutoGlass Store",
        price: "515.00",
        url: "https://example.com/p2"
      },
      {
        title: "Parabrisa Compatível Linha VW",
        store: "Marketplace Car",
        price: "450,00",
        url: "https://example.com/p3"
      },
      {
        title: "Produto Irrelevante",
        store: "Loja X",
        price: "1200.00",
        url: "https://example.com/p4"
      }
    ];
  }

  private static normalizePrice(text: string): number {
    if (typeof text === "number") return text;
    const cleaned = text.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
    return parseFloat(cleaned);
  }

  private static normalizeResults(results: any[], product: any): MarketResult[] {
    return results.map(res => {
      const price = this.normalizePrice(res.price);
      const similarityScore = this.calculateSimilarity(product.name, res.title);
      
      let confidence: "exato" | "semelhante" | "baixa confiança" = "baixa confiança";
      if (similarityScore > 0.85) confidence = "exato";
      else if (similarityScore > 0.6) confidence = "semelhante";

      return {
        title: res.title,
        store: res.store,
        price,
        url: res.url,
        similarityScore,
        confidence
      };
    }).filter(res => res.similarityScore > 0.4); // Filter out irrelevant results
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    const intersection = words1.filter(w => words2.includes(w));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  private static getTop3LowestPrices(results: MarketResult[]): MarketResult[] {
    return results
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
  }

  private static async getProductById(productId: string) {
    const { data } = await supabase
      .from("products")
      .select("*, compatibilities:product_vehicle_compatibility(vehicles(*))")
      .eq("id", productId)
      .single();
    
    // Transform the structure to match what buildSearchTerm expects
    if (data) {
      return {
        ...data,
        compatibilities: data.compatibilities?.map((c: any) => c.vehicles) || []
      };
    }

    // Fallback to mock data if DB is empty/not configured
    return null; 
  }

  private static async getCachedMarketPrices(productId: string) {
    const { data } = await supabase
      .from("market_price_cache")
      .select("*")
      .eq("product_id", productId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return {
        productId: data.product_id,
        searchTerm: data.search_term,
        queriedAt: data.created_at,
        results: data.results_json
      };
    }
    return null;
  }

  private static async getLastUpdateTime(productId: string) {
    const { data } = await supabase
      .from("market_price_cache")
      .select("created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    return data?.created_at;
  }

  private static async saveMarketPriceHistory(productId: string, searchTerm: string, results: MarketResult[]) {
    const entries = results.map(res => ({
      product_id: productId,
      search_term: searchTerm,
      source: res.store,
      result_title: res.title,
      result_price: res.price,
      result_url: res.url,
      similarity_score: res.similarityScore,
      is_cached: false
    }));

    await supabase.from("market_price_queries").insert(entries);
  }

  private static async saveToCache(productId: string, searchTerm: string, results: MarketResult[]) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from("market_price_cache").insert({
      product_id: productId,
      search_term: searchTerm,
      results_json: results,
      expires_at: expiresAt.toISOString()
    });
  }
}
