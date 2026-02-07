import axios from 'axios';

const nativeTokens = new Set([
    // Original tokens
    'bitcoin', 'ethereum', 'solana', 'avalanche-2', 'binancecoin', 'polkadot',
    'near', 'fantom', 'arbitrum', 'optimism', 'kaspa', 'hedera', 'stacks',
    'cardano',       // ADA
    'ripple',        // XRP
    'dogecoin',      // DOGE
    'litecoin',      // LTC
    'chainlink',     // LINK
    'tron',          // TRX
    'cosmos',        // ATOM
    'monero',        // XMR
    'stellar',       // XLM
    'uniswap',       // UNI
    'internet-computer', // ICP
    'okb',           // OKB
    'crypto-com-chain',  // CRO
    'vechain',       // VET
    'algorand',      // ALGO
    'the-graph',     // GRT
    'mantle',        // MNT
    'lido-dao',      // LDO
    'immutable-x',   // IMX
    'injective',     // INJ
    // Emerging & trending
    'toncoin',       // TON
    'aptos',         // APT
    'sui',           // SUI
    'sei-network',   // SEI
    'celestia',      // TIA
  ]);

const fetchTopPerformingNativeCoins = async () => {
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/coins/markets',
            {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',  // Fetching in descending market cap order
                    per_page: 250,  // Fetch more to ensure filtering works
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '30d'
                }
            }
        );

        // Filter for native blockchain coins only
        const topNativeCoins = await response.data
            .filter(coin => nativeTokens.has(coin.id))
            .sort((a, b) => (b.price_change_percentage_30d_in_currency || -100) - (a.price_change_percentage_30d_in_currency || -100))
            .slice(0, 10) // Pick top 10

            .map(coin => ({
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                price_change_30d: parseFloat(coin.price_change_percentage_30d_in_currency?.toFixed(2))
            }));

        // Create array of symbol and relative change pairs
        const symbolChangeArray = topNativeCoins.map((coin) => ({
            name: String(coin.name),
            symbol: String(coin.symbol),
            price_change_30d: parseFloat(coin.price_change_30d)
        }));
        return { symbolChangeArray};
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
        throw error;
    }
};
const fetchEthPrice = async () => {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const responseeth = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets',
        {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',  // Fetching in descending market cap order
                per_page: 250,  // Fetch more to ensure filtering works
                page: 1,
                sparkline: false,
                price_change_percentage: '30d'
            }
        }
    );
    const eth = responseeth.data.find(coin => coin.id === 'ethereum');
    const ethCurrentPrice  = parseFloat(eth.current_price)
    const ethChange = parseFloat(eth.price_change_percentage_30d_in_currency);
    const ethprice30dayback = parseFloat(eth.current_price  - ((ethChange * ethCurrentPrice)/ 100));
    return {cur : ethCurrentPrice , back :ethprice30dayback , change : ethChange};
}

export { fetchTopPerformingNativeCoins , fetchEthPrice };
// fetchTopPerformingNativeCoins()
// fetchEthPrice();