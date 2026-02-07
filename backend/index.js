import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getEthBalanceMonthBack } from "./balance.js"; 
import { fetchTopPerformingNativeCoins , fetchEthPrice} from "./top.js";

dotenv.config();  // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;  // Use environment variable for the port, default to 5000

app.use(cors());  // Enable CORS to allow requests from different origins
app.use(express.json());  // Parse incoming requests with JSON payloads

// Define an endpoint to fetch Ethereum balance for a given wallet address
app.get("/balance/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;  // Extract the wallet address from URL parameters
  
  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  try {
    const balanceData = await getEthBalanceMonthBack(walletAddress);  // Fetch balance data
    res.json(parseFloat(balanceData.balance));  // Send the balance data as a JSON response
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve balance", details: error.message });
  }
});

// Updated endpoint for top performing native coins
app.get("/top-coins", async (req, res) => {
  try {
    const { symbolChangeArray, ethPrice: ethPriceChange } = await fetchTopPerformingNativeCoins();
    
    res.json({
      symbolChangeArray,
      ethPrice: ethPriceChange
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch top coins", 
      details: error.message 
    });
  }
});
app.get("/eth-price", async (req, res) => {
  try {
    const ethPrice = await fetchEthPrice();
    res.json(ethPrice);  // Send just the price number
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ETH price", details: error.message });
  }
});
// Start the server
// Remove app.listen() for Vercel, or wrap it:
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
}

export default app; // Vercel needs this export