import { config } from "dotenv";
import { Network, Alchemy, Utils } from "alchemy-sdk";
import EthDater from "ethereum-block-by-date";
import { subMonths } from "date-fns";

config(); // Load environment variables

const settings = {
  apiKey: process.env.APIKEY, // Ensure you have this in your .env file
  network: Network.ETH_MAINNET, // Mainnet or testnet as needed
};
const alchemy = new Alchemy(settings);
const dater = new EthDater(alchemy.core);

async function getLatestTransactionBlock(walletAddress) {
  try {
    // Fetch the latest transactions for the wallet
    const txs = await alchemy.core.getAssetTransfers({
      fromAddress: walletAddress,
      category: ["external", "internal"],
      order: "desc", // Latest transactions first
      maxCount: 1, // Only need the latest transaction
    });

    if (txs.transfers.length === 0) {
      console.log("No transactions found for this wallet.");
      return null;
    }

    return txs.transfers[0].blockNum; // Return the latest transaction's block number
  } catch (error) {
    console.error("Error fetching latest transaction:", error.message);
    return null;
  }
}

async function getEthBalanceMonthBack(walletAddress) {
  try {
    // Get block number from one month ago
    const oneMonthBack = subMonths(new Date(), 1).toISOString();
    let block = await dater.getDate(oneMonthBack);
    let blockNumber = block.block;

    // Check if the account has any transactions in that timeframe
    const balance = await alchemy.core.getBalance(walletAddress, blockNumber);
    if (balance.toString() === "0") {
      console.log("No transactions in the last month. Fetching latest transaction block...");
      const latestTxBlock = await getLatestTransactionBlock(walletAddress);

      if (latestTxBlock) {
        blockNumber = latestTxBlock; // Use the latest transaction block
      } else {
        console.log("No transactions found at all. Using latest block.");
        blockNumber = "latest"; // Fallback to the latest block
      }
    }

    const finalBalance = await alchemy.core.getBalance(walletAddress, blockNumber);
    const formattedBalance = Utils.formatEther(finalBalance);


    return {
      balance: formattedBalance,
      blockNumber: blockNumber,
      timestamp: oneMonthBack,
      message: "Balance retrieved successfully",
    };
  } catch (error) {
    console.error("Error retrieving balance:", error.message);
    return {
      balance: null,
      error: "Failed to retrieve historical balance",
      details: error.message,
    };
  }
}

export { getEthBalanceMonthBack };