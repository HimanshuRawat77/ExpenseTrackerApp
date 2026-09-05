import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@expense_tracker_market_cache';

export const INITIAL_BULLION_RATES = {
  gold24k: {
    name: 'Gold 24K (999)',
    purity: '99.9% Pure Gold',
    pricePerGram: 7485,
    pricePer10g: 74850,
    unit: '₹ / 10g',
    change: 360,
    changePercent: 0.48,
    isPositive: true,
    benchmark: 'MCX Bullion National Benchmark',
  },
  gold22k: {
    name: 'Gold 22K (916)',
    purity: '91.6% Jewellery Gold',
    pricePerGram: 6860,
    pricePer10g: 68600,
    unit: '₹ / 10g',
    change: 330,
    changePercent: 0.48,
    isPositive: true,
    benchmark: 'IBJA Standard Retail Rate',
  },
  silver: {
    name: 'Silver (999)',
    purity: '99.9% Fine Silver',
    pricePerGram: 87.20,
    pricePerKg: 87200,
    unit: '₹ / 1 kg',
    change: 750,
    changePercent: 0.87,
    isPositive: true,
    benchmark: 'MCX Silver Spot Benchmark',
  },
  platinum: {
    name: 'Platinum (950)',
    purity: '95.0% Investment Grade',
    pricePerGram: 3160,
    pricePer10g: 31600,
    unit: '₹ / 10g',
    change: -20,
    changePercent: -0.63,
    isPositive: false,
    benchmark: 'International Spot Benchmark',
  },
};

export const INITIAL_INDICES = [
  {
    symbol: 'NIFTY 50',
    exchange: 'NSE India',
    price: '25,235.90',
    change: '+118.40',
    changePercent: '+0.47%',
    isPositive: true,
  },
  {
    symbol: 'SENSEX',
    exchange: 'BSE India',
    price: '82,559.85',
    change: '+392.15',
    changePercent: '+0.48%',
    isPositive: true,
  },
  {
    symbol: 'BANK NIFTY',
    exchange: 'NSE India',
    price: '51,560.20',
    change: '+214.30',
    changePercent: '+0.42%',
    isPositive: true,
  },
  {
    symbol: 'NASDAQ',
    exchange: 'US Tech',
    price: '17,910.50',
    change: '+95.20',
    changePercent: '+0.53%',
    isPositive: true,
  },
  {
    symbol: 'S&P 500',
    exchange: 'US Broad',
    price: '5,665.10',
    change: '+18.30',
    changePercent: '+0.32%',
    isPositive: true,
  },
  {
    symbol: 'USD / INR',
    exchange: 'Forex',
    price: '₹83.94',
    change: '+0.04',
    changePercent: '+0.05%',
    isPositive: true,
  },
  {
    symbol: 'BRENT CRUDE',
    exchange: 'Commodity',
    price: '$73.80/bbl',
    change: '-0.85',
    changePercent: '-1.14%',
    isPositive: false,
  },
];

export const INITIAL_NEWS = [
  {
    id: 'news-1',
    category: 'Bullion',
    categoryColor: '#EAB308', // Amber/Gold
    title: 'Gold & Silver Surge Across Domestic Markets on Festive Inflows & Fed Rate Outlook',
    summary: 'Physical gold prices in India traded near historic highs as retailers report solid festive booking and expectations of international interest rate cuts strengthen bullion demand.',
    content: 'Domestic gold prices held firm above ₹74,800 per 10 grams in major trading hubs including Mumbai, Delhi, and Chennai. Jewelers and bullion dealers note an uptick in advance bookings ahead of the upcoming festival and wedding seasons.\n\nMeanwhile, silver rallied close to ₹87,200 per kilogram supported by industrial demand from solar PV manufacturing and electric vehicle component suppliers. Analysts expect precious metals to maintain a bullish bias as global central banks signal monetary easing.',
    source: 'Economic Times',
    timeAgo: '1 hour ago',
    sentiment: 'Bullish',
    keyTakeaway: 'Great time to review precious metal asset allocation and consider Sovereign Gold Bonds or digital gold for long-term wealth preservation.',
  },
  {
    id: 'news-2',
    category: 'Stock Markets',
    categoryColor: '#10B981', // Emerald
    title: 'Nifty 50 and Sensex Hit Fresh Highs Led by Heavyweight Banking and IT Stocks',
    summary: 'Indian benchmark indices extended their winning streak as domestic institutional investors (DIIs) sustained continuous net buying and quarterly corporate earnings surpassed street estimates.',
    content: 'The BSE Sensex climbed over 390 points to cross 82,550 while the Nifty 50 comfortably traded above 25,200. Heavyweights in private banking and top-tier IT services led the charge.\n\nStrong macroeconomic indicators, robust GST tax collections, and stable inflation figures have bolstered investor confidence, with foreign portfolio investors turning net buyers in the cash segment.',
    source: 'Mint',
    timeAgo: '2 hours ago',
    sentiment: 'Bullish',
    keyTakeaway: 'Systematic Investment Plans (SIPs) in diversified equity index funds continue to offer steady compounding over long horizons.',
  },
  {
    id: 'news-3',
    category: 'Economy',
    categoryColor: '#6366F1', // Indigo
    title: 'RBI Keeps Repo Rate Steady; Inflation Projected to Move Toward 4% Target',
    summary: 'The Reserve Bank of India maintained its policy repo rate with a focus on durable disinflation and resilient economic growth projections exceeding 7.2%.',
    content: 'The Monetary Policy Committee (MPC) voted to keep the benchmark repo rate unchanged. RBI Governor highlighted that food price volatility is moderating and healthy monsoon distribution is likely to ease agricultural commodity pressures.\n\nCommercial bank deposit rates and home loan interest rates are anticipated to remain stable in the near term before any potential rate reductions early next year.',
    source: 'Reuters',
    timeAgo: '4 hours ago',
    sentiment: 'Neutral',
    keyTakeaway: 'Fixed deposit (FD) interest rates are near peak levels, making this an ideal window to lock in high-yield fixed return instruments.',
  },
  {
    id: 'news-4',
    category: 'Commodities',
    categoryColor: '#F59E0B',
    title: 'Crude Oil Drops Below $74 a Barrel; Welcome Relief for Indian Import Bills',
    summary: 'Brent crude oil prices declined as global supply fears eased and production quotas remained steady, providing tailwinds for domestic fuel retail and the Indian Rupee.',
    content: 'Brent crude dipped over 1% toward $73.80 per barrel. For India, which imports more than 85% of its crude oil requirements, lower international petroleum prices alleviate trade deficit pressures, improve fiscal math, and help keep domestic retail transport inflation in check.',
    source: 'Bloomberg',
    timeAgo: '5 hours ago',
    sentiment: 'Bullish for India',
    keyTakeaway: 'Lower fuel prices soften overall household transport and logistics expenses, boosting disposable discretionary income.',
  },
  {
    id: 'news-5',
    category: 'Personal Finance',
    categoryColor: '#3B82F6', // Blue
    title: 'New Tax Framework Rules: How to Optimize Your Savings & Emergency Funds',
    summary: 'Financial advisors recommend building an automated 6-month liquid emergency fund and taking full advantage of low-cost index investing.',
    content: 'As personal disposable incomes rise, financial planners emphasize the golden 50-30-20 budgeting rule: 50% for fixed necessities, 30% for lifestyle, and at least 20% strictly dedicated to automated savings and debt retirement.\n\nUsing an expense tracking tool to monitor recurring subscriptions and minor daily debits can easily recover 5% to 10% of monthly income from hidden leakages.',
    source: 'Financial Express',
    timeAgo: '7 hours ago',
    sentiment: 'Insight',
    keyTakeaway: 'Automate your monthly savings target on the day your salary is credited before initiating discretionary weekend spending.',
  },
];

/**
 * Fetches market data with fallback to cached and initial data
 */
export async function getMarketData() {
  try {
    // 1. Check local cache
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    let result = {
      bullion: INITIAL_BULLION_RATES,
      indices: INITIAL_INDICES,
      news: INITIAL_NEWS,
      lastUpdated: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        result = { ...result, ...parsed };
      } catch (e) {
        // Fallback to initial
      }
    }

    // 2. Try fetching fresh currency data with a short timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && data.rates.INR) {
          const inrRate = Number(data.rates.INR).toFixed(2);
          const eurInr = (Number(data.rates.INR) / Number(data.rates.EUR)).toFixed(2);

          result.indices = result.indices.map((item) => {
            if (item.symbol === 'USD / INR') {
              return { ...item, price: `₹${inrRate}` };
            }
            if (item.symbol === 'EUR / INR') {
              return { ...item, price: `₹${eurInr}` };
            }
            return item;
          });
          result.lastUpdated = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
        }
      }
    } catch (netErr) {
      // Network failure or offline - silently preserve cached/initial data
    }

    return result;
  } catch (err) {
    return {
      bullion: INITIAL_BULLION_RATES,
      indices: INITIAL_INDICES,
      news: INITIAL_NEWS,
      lastUpdated: 'Just now',
    };
  }
}
