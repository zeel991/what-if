import { useState, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Wallet, TrendingUp, AlertCircle, Check, Loader2, DollarSign } from 'lucide-react';

interface CoinComparison {
  coin: string;
  symbol: string;
  potentialGain: number;
  actualGain: number;
  priceChange: string;
  ethChange: number;
  tokenChange: number;
  ethWinner: boolean;
}

interface EthData {
  balance: number;
  currentPrice: number;
  monthAgoPrice: number;
  valueMonthAgo: number;
  currentValue: number;
  priceChange: number;
}

const BACKEND_URL = 'http://localhost:5000';
const ERROR_MESSAGES = {
  INVALID_ADDRESS: 'Invalid Ethereum address - Did you copy that right?',
  INVALID_AMOUNT: 'Please enter a valid ETH amount , Atleast imagine you are rich for a second.',
  NO_BALANCE: 'This wallet has no ETH balance! Try sending an address of NON-BROKE person.',
  DEFAULT_ERROR: 'Failed to analyze wallet. Please try again in a few minutes.'
};

const formatUSD = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    .format(value);

const useEthAnalysis = () => {
  const [address, setAddress] = useState('');
  const [manualEthAmount, setManualEthAmount] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comparisons, setComparisons] = useState<CoinComparison[]>([]);
  const [ethData, setEthData] = useState<EthData>({
    balance: 0,
    currentPrice: 0,
    monthAgoPrice: 0,
    valueMonthAgo: 0,
    currentValue: 0,
    priceChange: 0
  });

  const isValidAddress = useMemo(() => ethers.isAddress(address), [address]);
  const isValidAmount = useMemo(() => parseFloat(manualEthAmount) > 0, [manualEthAmount]);

  const validateInputs = useCallback(() => {
    if (useManualEntry) {
      if (!isValidAmount) {
        setError(ERROR_MESSAGES.INVALID_AMOUNT);
        return false;
      }
    } else {
      if (!isValidAddress) {
        setError(ERROR_MESSAGES.INVALID_ADDRESS);
        return false;
      }
    }
    setError('');
    return true;
  }, [useManualEntry, isValidAddress, isValidAmount]);

  const analyzeWallet = useCallback(async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    setError('');

    try {
      let ethAmountMonthBack = useManualEntry ? parseFloat(manualEthAmount) : 0;
      
      if (!useManualEntry) {
        const balanceRes = await axios.get(`${BACKEND_URL}/balance/${address}`);
        ethAmountMonthBack = parseFloat(balanceRes.data);
      }

      if (ethAmountMonthBack <= 0) throw new Error(ERROR_MESSAGES.NO_BALANCE);

      const pricesRes = await axios.get(`${BACKEND_URL}/eth-price`);
      const CurrentEthPrice = parseFloat(pricesRes.data.cur);
      const MonthBackEthPrice = parseFloat(pricesRes.data.back);
      const ethPriceChange = parseFloat(pricesRes.data.change);

      const newEthData = {
        balance: ethAmountMonthBack,
        currentPrice: CurrentEthPrice,
        monthAgoPrice: MonthBackEthPrice,
        valueMonthAgo: ethAmountMonthBack * MonthBackEthPrice,
        currentValue: ethAmountMonthBack * CurrentEthPrice,
        priceChange: ethPriceChange
      };
      setEthData(newEthData);

      const { data: { symbolChangeArray } } = await axios.get(`${BACKEND_URL}/top-coins`);
      
      const processedComparisons = symbolChangeArray.map((coin: any) => 
        processCoinComparison(coin, newEthData, ethPriceChange)
      );

      setComparisons(sortComparisons(processedComparisons));
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.DEFAULT_ERROR);
    } finally {
      setLoading(false);
    }
  }, [validateInputs, useManualEntry, manualEthAmount, address]);

  return {
    address,
    loading,
    error,
    comparisons,
    ethData,
    isValidAddress,
    validateAddress: setAddress,
    analyzeWallet,
    manualEthAmount,
    setManualEthAmount,
    useManualEntry,
    setUseManualEntry,
    isValidAmount,
  };
};

const processCoinComparison = (coin: any, ethData: EthData, ethPriceChange: number): CoinComparison => {
  const tokenChange = parseFloat(coin.price_change_30d);
  const initialValue = ethData.valueMonthAgo;
  
  const ethValue = initialValue * (1 + (ethPriceChange / 100));
  const tokenValue = initialValue * (1 + (tokenChange / 100));
  const potentialGain = tokenValue - ethValue;
  const ethWinner = tokenChange <= ethPriceChange;

  return {
    coin: coin.name,
    symbol: coin.symbol,
    potentialGain,
    actualGain: tokenChange,
    priceChange: coin.price_change_30d,
    ethChange: ethPriceChange,
    tokenChange,
    ethWinner
  };
};

const sortComparisons = (comparisons: CoinComparison[]) => 
  comparisons.sort((a, b) => {
    const aPositive = a.actualGain > 0;
    const bPositive = b.actualGain > 0;
    
    if (aPositive !== bPositive) return aPositive ? -1 : 1;
    return aPositive ? b.actualGain - a.actualGain : a.actualGain - b.actualGain;
  });

const PortfolioDisplay = ({ ethData }: { ethData: EthData }) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
      <DollarSign className="w-6 h-6" />
      Your Portfolio
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">ETH Holdings One Month Ago</h3>
        <p className="text-3xl font-bold text-green-400">
          {ethData.balance.toFixed(4)} ETH
        </p>
        <p className="text-xl text-gray-300">
          {formatUSD(ethData.valueMonthAgo)}
        </p>
      </div>
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Current Value if Held</h3>
        <p className="text-3xl font-bold text-purple-400">
          {formatUSD(ethData.currentValue)}
        </p>
      </div>
    </div>
  </div>
);

const CoinComparisonItem = ({ coin }: { coin: CoinComparison }) => {
  const gainColor = useMemo(() => {
    if (coin.ethWinner) return 'text-green-400';
    if (coin.actualGain > 0) return coin.potentialGain > 1000 ? 'text-green-400' : 'text-yellow-400';
    return coin.potentialGain >= 3000 ? 'text-red-400' : 'text-yellow-400';
  }, [coin]);

  const gainMessage = useMemo(() => {
    if (coin.ethWinner) return "You made the right choice! 🎯";
    if (coin.actualGain > 0) return `You could have made an extra ${formatUSD(coin.potentialGain)}!`;
    return `You could have saved ${formatUSD(Math.abs(coin.potentialGain))}`;
  }, [coin]);

  return (
    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold">{coin.coin}</h3>
          <p className="text-gray-400">{coin.symbol}</p>
        </div>
        <div className="ml-auto">
          <p className={`text-2xl font-bold ${gainColor}`}>
            {coin.actualGain}%
          </p>
          <p className="text-sm text-gray-400">30-day growth</p>
        </div>
      </div>
      <div className="bg-white/5 rounded-lg p-4">
        <p className="text-lg">
          If you had converted your ETH to {coin.symbol} one month ago:
        </p>
        <p className={`text-2xl font-bold mt-2 ${gainColor}`}>
          {gainMessage}
        </p>
      </div>
    </div>
  );
};

function App() {
  const {
    address,
    loading,
    error,
    comparisons,
    ethData,
    isValidAddress,
    validateAddress,
    analyzeWallet,
    manualEthAmount,
    setManualEthAmount,
    useManualEntry,
    setUseManualEntry,
    isValidAmount,
  } = useEthAnalysis();

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Wallet className="w-10 h-10" />
              Ethereum What-If Machine
            </h1>
            <p className="text-gray-300">Discover the road not taken (and maybe cry a little) 😢</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setUseManualEntry(false)}
                  className={`px-4 py-2 rounded-lg ${
                    !useManualEntry ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
                  } transition-colors`}
                >
                  Use Wallet Address
                </button>
                <button
                  onClick={() => setUseManualEntry(true)}
                  className={`px-4 py-2 rounded-lg ${
                    useManualEntry ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
                  } transition-colors`}
                >
                  Enter ETH Manually
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                analyzeWallet();
              }}>
                <div className="flex flex-col gap-4">
                  {!useManualEntry ? (
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => validateAddress(e.target.value)}
                      placeholder="Enter your Ethereum wallet address (prepare for FOMO)"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/20 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="number"
                        value={manualEthAmount}
                        onChange={(e) => setManualEthAmount(e.target.value)}
                        placeholder="Enter ETH amount you held one month ago"
                        className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/20 focus:outline-none focus:border-purple-500 transition-colors"
                        step="0.0001"
                        min="0"
                      />
                      <p className="text-sm text-gray-400">
                        Example: 10.5 (for 10.5 ETH)
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={(useManualEntry ? !isValidAmount : !isValidAddress) || loading}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                      (useManualEntry ? isValidAmount : isValidAddress)
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                    {loading ? 'Analyzing...' : 'Show Me What Could Have Been'}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-3 text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {!useManualEntry && isValidAddress && !error && (
                <div className="mt-3 text-green-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Valid address! Time to see what could have been...
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Calculating your alternate timeline wealth...</p>
            </div>
          )}

          {!loading && ethData.balance > 0 && (
            <div className="space-y-8">
              <PortfolioDisplay ethData={ethData} />
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  What You Could Have Had
                </h2>
                <div className="grid grid-cols-1 gap-8">
                  {comparisons.map((coin) => (
                    <CoinComparisonItem key={coin.coin} coin={coin} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;