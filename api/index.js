import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getEthBalanceMonthBack } from "./balance.js"; 
import { fetchTopPerformingNativeCoins , fetchEthPrice} from "./top.js";

dotenv.config();

const app = express();
// Vercel sets the PORT automatically, but we keep this for local dev
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Health Check Route (Useful for debugging)
app.get("/api", (req, res) => {
  res.json({ status: "API is running", message: "Connect to /api/eth-price to see data" });
});

// 2. Updated routes with /api prefix
app.get("/api/balance/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;
  
  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  try {
    const balanceData = await getEthBalanceMonthBack(walletAddress);
    res.json(parseFloat(balanceData.balance));
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve balance", details: error.message });
  }
});

app.get("/api/top-coins", async (req, res) => {
  try {
    const { symbolChangeArray, ethPrice: ethPriceChange } = await fetchTopPerformingNativeCoins();
    res.json({ symbolChangeArray, ethPrice: ethPriceChange });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top coins", details: error.message });
  }
});

app.get("/api/eth-price", async (req, res) => {
  try {
    const ethPrice = await fetchEthPrice();
    res.json(ethPrice);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ETH price", details: error.message });
  }
});

// Start the server ONLY if not on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}

export default app;