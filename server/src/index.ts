import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MarketScrapingService } from "./services/MarketScrapingService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoint to get market prices for a specific product
app.get("/api/market-prices/:productId", async (req, res) => {
  const { productId } = req.params;
  const forceUpdate = req.query.force === "true";

  try {
    const result = await MarketScrapingService.searchMarketPrices(productId, forceUpdate);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
