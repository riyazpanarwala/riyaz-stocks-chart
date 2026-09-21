// src/services/market/sectorBreadthService.js
import YahooFinance from "yahoo-finance2";

const defaultYahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Cache storage for sector breadth data (60 seconds TTL, 10s cooldown for forced refresh)
let cachedBreadthData = null;
let lastFetchTimestamp = 0;
let pendingFetchPromise = null;
const CACHE_TTL_MS = 60 * 1000;
const MIN_REFRESH_COOLDOWN_MS = 10 * 1000;

export const SECTOR_DEFINITIONS = [
  {
    id: "bank",
    name: "NIFTY BANK",
    symbol: "^NSEBANK",
    category: "Banking & Financials",
    weight: 32.5,
    icon: "🏦",
    constituents: [
      "HDFCBANK.NS",
      "ICICIBANK.NS",
      "SBIN.NS",
      "KOTAKBANK.NS",
      "AXISBANK.NS",
      "INDUSINDBK.NS",
      "BANKBARODA.NS",
      "PNB.NS",
      "FEDERALBNK.NS",
      "IDFCFIRSTB.NS",
    ],
  },
  {
    id: "it",
    name: "NIFTY IT",
    symbol: "^CNXIT",
    category: "Information Technology",
    weight: 13.8,
    icon: "💻",
    constituents: [
      "TCS.NS",
      "INFY.NS",
      "HCLTECH.NS",
      "WIPRO.NS",
      "TECHM.NS",
      "LTIM.NS",
      "PERSISTENT.NS",
      "COFORGE.NS",
      "LTTS.NS",
    ],
  },
  {
    id: "auto",
    name: "NIFTY AUTO",
    symbol: "^CNXAUTO",
    category: "Automobiles",
    weight: 7.2,
    icon: "🚗",
    constituents: [
      "TATAMOTORS.NS",
      "M&M.NS",
      "MARUTI.NS",
      "BAJAJ-AUTO.NS",
      "EICHERMOT.NS",
      "TVSMOTOR.NS",
      "HEROMOTOCO.NS",
      "BHARATFORG.NS",
      "ASHOKLEY.NS",
    ],
  },
  {
    id: "pharma",
    name: "NIFTY PHARMA",
    symbol: "^CNXPHARMA",
    category: "Healthcare & Pharma",
    weight: 4.5,
    icon: "💊",
    constituents: [
      "SUNPHARMA.NS",
      "DRREDDY.NS",
      "CIPLA.NS",
      "DIVISLAB.NS",
      "LUPIN.NS",
      "ZYDUSLIFE.NS",
      "TORNTPHARM.NS",
      "AUROPHARMA.NS",
      "MANKIND.NS",
      "BIOCON.NS",
    ],
  },
  {
    id: "fmcg",
    name: "NIFTY FMCG",
    symbol: "^CNXFMCG",
    category: "Consumer Staples",
    weight: 8.5,
    icon: "🛒",
    constituents: [
      "ITC.NS",
      "HINDUNILVR.NS",
      "NESTLEIND.NS",
      "BRITANNIA.NS",
      "TATACONSUM.NS",
      "DABUR.NS",
      "MARICO.NS",
      "GODREJCP.NS",
      "COLPAL.NS",
      "VBL.NS",
    ],
  },
  {
    id: "metal",
    name: "NIFTY METAL",
    symbol: "^CNXMETAL",
    category: "Metals & Mining",
    weight: 3.8,
    icon: "⚙️",
    constituents: [
      "TATASTEEL.NS",
      "JSWSTEEL.NS",
      "HINDALCO.NS",
      "VEDL.NS",
      "JINDALSTEL.NS",
      "COALINDIA.NS",
      "NMDC.NS",
      "SAIL.NS",
      "NATIONALUM.NS",
    ],
  },
  {
    id: "energy",
    name: "NIFTY ENERGY",
    symbol: "^CNXENERGY",
    category: "Oil, Gas & Energy",
    weight: 12.0,
    icon: "⚡",
    constituents: [
      "RELIANCE.NS",
      "ONGC.NS",
      "NTPC.NS",
      "POWERGRID.NS",
      "BPCL.NS",
      "IOC.NS",
      "GAIL.NS",
      "TATAPOWER.NS",
      "ADANIGREEN.NS",
    ],
  },
  {
    id: "realty",
    name: "NIFTY REALTY",
    symbol: "^CNXREALTY",
    category: "Real Estate",
    weight: 1.5,
    icon: "🏢",
    constituents: [
      "DLF.NS",
      "GODREJPROP.NS",
      "LODHA.NS",
      "OBEROIRLTY.NS",
      "PHOENIXLTD.NS",
      "BRIGADE.NS",
      "PRESTIGE.NS",
      "SOBHA.NS",
    ],
  },
  {
    id: "psubank",
    name: "NIFTY PSU BANK",
    symbol: "^CNXPSUBANK",
    category: "Public Sector Banks",
    weight: 3.2,
    icon: "🏛️",
    constituents: [
      "SBIN.NS",
      "BANKBARODA.NS",
      "PNB.NS",
      "CANBK.NS",
      "UNIONBANK.NS",
      "INDIANB.NS",
      "MAHABANK.NS",
      "CENTRALBK.NS",
    ],
  },
  {
    id: "infra",
    name: "NIFTY INFRA",
    symbol: "^CNXINFRA",
    category: "Infrastructure",
    weight: 4.8,
    icon: "🏗️",
    constituents: [
      "LT.NS",
      "ULTRACEMCO.NS",
      "ADANIPORTS.NS",
      "GRASIM.NS",
      "BHARTIARTL.NS",
      "AMBUJACEM.NS",
    ],
  },
  {
    id: "finserv",
    name: "NIFTY FIN SERVICE",
    symbol: "NIFTY_FIN_SERVICE.NS",
    category: "Financial Services",
    weight: 8.0,
    icon: "💳",
    constituents: [
      "HDFCBANK.NS",
      "ICICIBANK.NS",
      "BAJFINANCE.NS",
      "BAJAJFINSV.NS",
      "KOTAKBANK.NS",
      "AXISBANK.NS",
      "HDFCLIFE.NS",
      "SBILIFE.NS",
      "CHOLAFIN.NS",
    ],
  },
  {
    id: "midcap",
    name: "NIFTY MIDCAP 100",
    symbol: "NIFTY_MIDCAP_100.NS",
    category: "Midcap Universe",
    weight: 6.0,
    icon: "🚀",
    constituents: [
      "PERSISTENT.NS",
      "POLYCAB.NS",
      "DIXON.NS",
      "TRENT.NS",
      "BEL.NS",
      "HAL.NS",
      "CUMMINSIND.NS",
      "FEDERALBNK.NS",
      "ASHOKLEY.NS",
    ],
  },
];

const BENCHMARK_SYMBOLS = ["^NSEI", "^CRSLDX"];

/**
 * Strips exchange suffix from ticker symbols (e.g. "TCS.NS" -> "TCS").
 * @param {string} symbol - Ticker symbol with optional exchange suffix.
 * @returns {string} Clean symbol identifier.
 */
export function cleanSymbol(symbol) {
  if (!symbol) return "";
  return symbol.replace(/\.NS$/, "").replace(/\.BO$/, "");
}

/**
 * Formats a raw quote item from Yahoo Finance into a standardized quote object.
 * @param {object} q - Raw quote item from Yahoo Finance API.
 * @returns {object|null} Formatted quote object or null if input is invalid.
 */
export function formatQuote(q) {
  if (!q) return null;
  const price = Number(q.regularMarketPrice ?? 0);
  const change = Number(q.regularMarketChange ?? 0);
  const changePercent = Number(q.regularMarketChangePercent ?? 0);
  const fiftyDayAvg = Number(q.fiftyDayAverage ?? 0);
  const twoHundredDayAvg = Number(q.twoHundredDayAverage ?? 0);
  const high52 = Number(q.fiftyTwoWeekHigh ?? 0);
  const low52 = Number(q.fiftyTwoWeekLow ?? 0);
  const volume = Number(q.regularMarketVolume ?? 0);

  const above50 = fiftyDayAvg > 0 ? price > fiftyDayAvg : null;
  const above200 = twoHundredDayAvg > 0 ? price > twoHundredDayAvg : null;

  // Near 52W High (within 3%) or Low (within 3%)
  const isNear52WHigh = high52 > 0 && price >= high52 * 0.97;
  const isNear52WLow = low52 > 0 && price <= low52 * 1.03;

  return {
    symbol: cleanSymbol(q.symbol),
    rawSymbol: q.symbol,
    name: q.shortName || q.longName || cleanSymbol(q.symbol),
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    dayHigh: Number((q.regularMarketDayHigh ?? 0).toFixed(2)),
    dayLow: Number((q.regularMarketDayLow ?? 0).toFixed(2)),
    volume,
    fiftyDayAverage: Number(fiftyDayAvg.toFixed(2)),
    twoHundredDayAverage: Number(twoHundredDayAvg.toFixed(2)),
    above50,
    above200,
    fiftyTwoWeekHigh: Number(high52.toFixed(2)),
    fiftyTwoWeekLow: Number(low52.toFixed(2)),
    isNear52WHigh,
    isNear52WLow,
  };
}

/**
 * Internal executor that fetches fresh quotes and builds the heatmap & breadth payload.
 * @param {object} options
 * @param {object} [options.client] - Yahoo Finance client instance (injected for testing).
 * @returns {Promise<object>} Complete heatmap and breadth payload.
 */
async function executeFetchSectorBreadth({ client = defaultYahooFinance } = {}) {
  const now = Date.now();

  // 1. Gather all unique symbols to query in batch
  const sectorSymbols = SECTOR_DEFINITIONS.map((s) => s.symbol);
  const allConstituentSymbols = Array.from(
    new Set(SECTOR_DEFINITIONS.flatMap((s) => s.constituents))
  );
  const allSymbolsToFetch = Array.from(
    new Set([...BENCHMARK_SYMBOLS, ...sectorSymbols, ...allConstituentSymbols])
  );

  let rawQuotes = [];
  try {
    rawQuotes = await client.quote(allSymbolsToFetch);
  } catch (error) {
    // If batch fails, fallback to cached data if available without leaking internal message
    if (cachedBreadthData) {
      console.warn("Sector breadth batch quote failed, returning stale cache:", error.message);
      return {
        ...cachedBreadthData,
        isCached: true,
        isStale: true,
        cacheAgeSeconds: Math.floor((now - lastFetchTimestamp) / 1000),
      };
    }
    throw error;
  }

  // Map raw quotes by symbol and rawSymbol
  const quoteMap = new Map();
  for (const q of rawQuotes) {
    if (q && q.symbol) {
      const formatted = formatQuote(q);
      if (formatted) {
        quoteMap.set(q.symbol, formatted);
        quoteMap.set(cleanSymbol(q.symbol), formatted);
      }
    }
  }

  // 2. Format benchmark (NIFTY 50 and NIFTY 500)
  const nifty50Quote = quoteMap.get("^NSEI") || {
    symbol: "NIFTY 50",
    price: 0,
    changePercent: 0,
  };
  const nifty500Quote = quoteMap.get("^CRSLDX") || null;

  // 3. Process Sector indices
  const sectors = SECTOR_DEFINITIONS.map((def) => {
    const quote = quoteMap.get(def.symbol) || {
      price: 0,
      changePercent: 0,
      change: 0,
      dayHigh: 0,
      dayLow: 0,
    };

    // Gather constituent quotes for this sector
    const constituentQuotes = def.constituents
      .map((sym) => quoteMap.get(sym) || quoteMap.get(cleanSymbol(sym)))
      .filter(Boolean);

    // Sort constituents by daily performance
    const sortedConstituents = [...constituentQuotes].sort(
      (a, b) => b.changePercent - a.changePercent
    );

    const topGainer = sortedConstituents[0] || null;
    const topLoser = sortedConstituents[sortedConstituents.length - 1] || null;

    const sectorAdvances = constituentQuotes.filter((c) => c.changePercent > 0).length;
    const sectorDeclines = constituentQuotes.filter((c) => c.changePercent < 0).length;

    return {
      id: def.id,
      name: def.name,
      symbol: def.symbol,
      category: def.category,
      weight: def.weight,
      icon: def.icon,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      advances: sectorAdvances,
      declines: sectorDeclines,
      topGainer: topGainer
        ? { symbol: topGainer.symbol, changePercent: topGainer.changePercent }
        : null,
      topLoser: topLoser
        ? { symbol: topLoser.symbol, changePercent: topLoser.changePercent }
        : null,
      constituents: sortedConstituents,
    };
  });

  // Sort sectors by performance descending
  sectors.sort((a, b) => b.changePercent - a.changePercent);

  // 4. Calculate Market Breadth across all unique active constituents
  const uniqueConstituents = allConstituentSymbols
    .map((s) => quoteMap.get(s) || quoteMap.get(cleanSymbol(s)))
    .filter(Boolean);

  let advances = 0;
  let declines = 0;
  let unchanged = 0;
  let countAbove50 = 0;
  let validAbove50Count = 0;
  let countAbove200 = 0;
  let validAbove200Count = 0;
  let countNear52WHigh = 0;
  let countNear52WLow = 0;
  let advancingVolume = 0;
  let decliningVolume = 0;

  for (const c of uniqueConstituents) {
    if (c.changePercent > 0) {
      advances++;
      advancingVolume += c.volume || 0;
    } else if (c.changePercent < 0) {
      declines++;
      decliningVolume += c.volume || 0;
    } else {
      unchanged++;
    }

    if (c.above50 !== null) {
      validAbove50Count++;
      if (c.above50) countAbove50++;
    }

    if (c.above200 !== null) {
      validAbove200Count++;
      if (c.above200) countAbove200++;
    }

    if (c.isNear52WHigh) countNear52WHigh++;
    if (c.isNear52WLow) countNear52WLow++;
  }

  const totalStocks = uniqueConstituents.length;
  const adRatio = declines > 0 ? Number((advances / declines).toFixed(2)) : advances;
  const advancesPct = totalStocks > 0 ? Number(((advances / totalStocks) * 100).toFixed(1)) : 0;
  const declinesPct = totalStocks > 0 ? Number(((declines / totalStocks) * 100).toFixed(1)) : 0;
  const unchangedPct =
    totalStocks > 0 ? Number(((unchanged / totalStocks) * 100).toFixed(1)) : 0;

  // Calculate moving average health based on valid non-null quotes
  const above50Pct =
    validAbove50Count > 0 ? Number(((countAbove50 / validAbove50Count) * 100).toFixed(1)) : 0;
  const above200Pct =
    validAbove200Count > 0 ? Number(((countAbove200 / validAbove200Count) * 100).toFixed(1)) : 0;

  const totalVolume = advancingVolume + decliningVolume;
  const advancingVolumePct =
    totalVolume > 0 ? Number(((advancingVolume / totalVolume) * 100).toFixed(1)) : 50;

  // Breadth regime determination based on accurate percentages
  let breadthRegime = "Neutral";
  let regimeColor = "neutral";
  if (adRatio >= 2.0 && above50Pct >= 60) {
    breadthRegime = "Strong Bullish Expansion";
    regimeColor = "bullish";
  } else if (adRatio > 1.2 && above50Pct >= 50) {
    breadthRegime = "Mild Bullish Bias";
    regimeColor = "mild-bullish";
  } else if (adRatio <= 0.5 || (declinesPct > 65 && above50Pct < 40)) {
    breadthRegime = "Strong Bearish Distribution";
    regimeColor = "bearish";
  } else if (adRatio < 0.85) {
    breadthRegime = "Defensive / Profit Booking";
    regimeColor = "mild-bearish";
  }

  const breadth = {
    totalStocks,
    advances,
    declines,
    unchanged,
    advancesPct,
    declinesPct,
    unchangedPct,
    adRatio,
    above50Count: countAbove50,
    above50Total: validAbove50Count,
    above50Pct,
    above200Count: countAbove200,
    above200Total: validAbove200Count,
    above200Pct,
    near52WHighCount: countNear52WHigh,
    near52WLowCount: countNear52WLow,
    netNewHighs: countNear52WHigh - countNear52WLow,
    advancingVolumePct,
    breadthRegime,
    regimeColor,
  };

  const payload = {
    timestamp: new Date().toISOString(),
    benchmark: {
      nifty50: nifty50Quote,
      nifty500: nifty500Quote,
    },
    breadth,
    sectors,
  };

  // Cache update
  cachedBreadthData = payload;
  lastFetchTimestamp = now;

  return {
    ...payload,
    isCached: false,
    cacheAgeSeconds: 0,
  };
}

/**
 * Fetches sector quotes and calculates market breadth metrics deterministically with caching,
 * request coalescing, and forced-refresh rate protection.
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false] - Bypass standard cache if true (subject to cooldown).
 * @param {object} [options.quoteClient] - Optional Yahoo Finance client instance (for testing/mocking).
 * @returns {Promise<object>} Complete heatmap and breadth payload.
 */
export async function getSectorBreadthData({ forceRefresh = false, quoteClient = defaultYahooFinance } = {}) {
  const now = Date.now();

  // If a fetch is currently in-flight, return the same promise (request coalescing)
  if (pendingFetchPromise) {
    return pendingFetchPromise;
  }

  // Return from standard cache if within TTL
  if (!forceRefresh && cachedBreadthData && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return {
      ...cachedBreadthData,
      isCached: true,
      cacheAgeSeconds: Math.floor((now - lastFetchTimestamp) / 1000),
    };
  }

  // If forced refresh requested within cooldown period, return cached data to protect upstream
  if (forceRefresh && cachedBreadthData && now - lastFetchTimestamp < MIN_REFRESH_COOLDOWN_MS) {
    return {
      ...cachedBreadthData,
      isCached: true,
      cacheAgeSeconds: Math.floor((now - lastFetchTimestamp) / 1000),
    };
  }

  // Launch coalesced fetch
  pendingFetchPromise = executeFetchSectorBreadth({ client: quoteClient })
    .finally(() => {
      pendingFetchPromise = null;
    });

  return pendingFetchPromise;
}

/**
 * Resets the in-memory cache (primarily for unit test isolation).
 */
export function resetSectorBreadthCache() {
  cachedBreadthData = null;
  lastFetchTimestamp = 0;
  pendingFetchPromise = null;
}
