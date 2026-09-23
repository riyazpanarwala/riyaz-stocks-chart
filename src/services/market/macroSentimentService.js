// src/services/market/macroSentimentService.js
import YahooFinance from "yahoo-finance2";
import { NseIndia } from "stock-nse-india";
import { getSectorBreadthData } from "./sectorBreadthService.js";

const defaultYahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const defaultNseIndia = new NseIndia();

// In-memory cache storage (60s TTL, 10s minimum cooldown for forced refresh)
let cachedSentimentData = null;
let lastFetchTimestamp = 0;
let pendingFetchPromise = null;
const CACHE_TTL_MS = 60 * 1000;
const MIN_REFRESH_COOLDOWN_MS = 10 * 1000;

/**
 * Classifies the India VIX level into a volatility regime with actionable advice.
 * @param {number} vix - Numeric India VIX reading.
 * @returns {object} Volatility regime info.
 */
export function classifyVixRegime(vix) {
  const value = Number(vix) || 0;

  if (value <= 0) {
    return {
      zone: "Unknown",
      badgeColor: "neutral",
      label: "Data Unavailable",
      description: "Volatility data currently offline or market is closed.",
      equityAdvice: "Maintain standard risk controls.",
      optionBuyers: "Check implied volatility before buying.",
      optionSellers: "Ensure adequate stop losses.",
    };
  }

  if (value < 12) {
    return {
      zone: "Low",
      badgeColor: "success",
      label: "Complacent / Low Volatility",
      description:
        "Calm, range-bound or steady trending market. Option premiums are relatively cheap with reduced implied volatility risk.",
      equityAdvice: "Favorable for trend continuation and swing buying on dips.",
      optionBuyers: "Attractive environment for directional debit spreads with low option premium cost.",
      optionSellers: "Lower premiums received; avoid naked out-of-the-money selling with poor risk-reward.",
    };
  }

  if (value < 16) {
    return {
      zone: "Normal",
      badgeColor: "info",
      label: "Healthy / Balanced Volatility",
      description:
        "Balanced market conditions where price action respects technical support and resistance levels reliably.",
      equityAdvice: "Ideal environment for technical swing trades and sector rotation plays.",
      optionBuyers: "Standard conditions for intraday breakouts and directional momentum options.",
      optionSellers: "Healthy balance of premium collection and manageable gamma risk.",
    };
  }

  if (value < 22) {
    return {
      zone: "Elevated",
      badgeColor: "warning",
      label: "Elevated / Caution Zone",
      description:
        "Heightened uncertainty and wide intraday swings. Sharp reversals and increased headline sensitivity.",
      equityAdvice: "Reduce position sizing by 30-50% and trail tight stop-losses.",
      optionBuyers: "Premiums are elevated; watch out for rapid theta and IV crush after events.",
      optionSellers: "High premium yields, but strictly use defined-risk spreads (credit spreads, iron condors).",
    };
  }

  return {
    zone: "High",
    badgeColor: "danger",
    label: "Extreme Panic / Event Risk",
    description:
      "Severe volatility or macro shock. Rapid intraday swings, gap openings, and elevated risk of whipsaw.",
    equityAdvice: "High cash allocation recommended. Avoid aggressive leverage.",
    optionBuyers: "Avoid buying inflated far-OTM options; IV crush risk is severe.",
    optionSellers: "Extreme gamma risk; naked option writing can be catastrophic.",
  };
}

export { getVixGaugePercent } from "../../lib/market/vixHelpers.js";

/**
 * Classifies FII and DII net cash investments into an institutional bias.
 * @param {number} fiiNet - FII Net Investment in ₹ Crores.
 * @param {number} diiNet - DII Net Investment in ₹ Crores.
 * @returns {object} Institutional stance classification.
 */
export function classifyInstitutionalStance(fiiNet, diiNet) {
  const combinedNet = (fiiNet || 0) + (diiNet || 0);

  if (fiiNet > 500 && diiNet > 500) {
    return {
      stance: "Coordinated Strong Accumulation",
      badgeColor: "success",
      bias: "Strongly Bullish",
      summary: "Both Foreign & Domestic institutions are aggressive net buyers in the cash market.",
      combinedNet: Number(combinedNet.toFixed(2)),
    };
  }

  if (fiiNet > 0 && diiNet > 0) {
    return {
      stance: "Moderate Institutional Inflow",
      badgeColor: "success",
      bias: "Bullish",
      summary: "Positive net inflows from both FIIs and DIIs supporting market momentum.",
      combinedNet: Number(combinedNet.toFixed(2)),
    };
  }

  if (fiiNet < 0 && diiNet > Math.abs(fiiNet)) {
    return {
      stance: "DII Absorption of FII Outflows",
      badgeColor: "info",
      bias: "Neutral to Mildly Bullish",
      summary: "Domestic institutions are absorbing Foreign outflows, maintaining market stability.",
      combinedNet: Number(combinedNet.toFixed(2)),
    };
  }

  if (fiiNet < -1500 && diiNet < 1000) {
    return {
      stance: "Heavy FII Distribution",
      badgeColor: "danger",
      bias: "Bearish Headwind",
      summary: "Heavy foreign institutional selling putting strong downward pressure on large-cap indices.",
      combinedNet: Number(combinedNet.toFixed(2)),
    };
  }

  if (fiiNet < 0 && diiNet < 0) {
    return {
      stance: "Twin Institutional Liquidation",
      badgeColor: "danger",
      bias: "Strongly Bearish",
      summary: "Both Foreign and Domestic funds are net sellers, signaling defensive risk-off sentiment.",
      combinedNet: Number(combinedNet.toFixed(2)),
    };
  }

  return {
    stance: "Mixed / Balanced Institutional Flows",
    badgeColor: "neutral",
    bias: "Neutral",
    summary: "Balanced institutional participation with no dominant directional accumulation.",
    combinedNet: Number(combinedNet.toFixed(2)),
  };
}

/**
 * Normalizes raw FII/DII API records into clean numerical data.
 * @param {Array<object>} records - Raw items from NSE /api/fiidiiTradeReact.
 * @returns {object} Formatted FII & DII data.
 */
export function formatFiiDiiData(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      fii: { buy: 0, sell: 0, net: 0 },
      dii: { buy: 0, sell: 0, net: 0 },
      stance: classifyInstitutionalStance(0, 0),
    };
  }

  let fii = { buy: 0, sell: 0, net: 0 };
  let dii = { buy: 0, sell: 0, net: 0 };
  let date = "";

  for (const item of records) {
    if (!item) continue;
    const cat = String(item.category || "").toUpperCase();
    const buy = parseFloat(item.buyValue || 0) || 0;
    const sell = parseFloat(item.sellValue || 0) || 0;
    const net = parseFloat(item.netValue || 0) || 0;
    if (item.date) date = item.date;

    if (cat.includes("FII") || cat.includes("FPI")) {
      fii = {
        buy: Number(buy.toFixed(2)),
        sell: Number(sell.toFixed(2)),
        net: Number(net.toFixed(2)),
      };
    } else if (cat.includes("DII")) {
      dii = {
        buy: Number(buy.toFixed(2)),
        sell: Number(sell.toFixed(2)),
        net: Number(net.toFixed(2)),
      };
    }
  }

  const stance = classifyInstitutionalStance(fii.net, dii.net);

  return {
    date: date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    fii,
    dii,
    stance,
  };
}

/**
 * Formats multi-index breadth and valuation from getAllIndices data.
 * @param {Array<object>} allIndices - Array of index objects from NSE.
 * @returns {object} Multi-index breadth and valuation metrics.
 */
export function formatIndexBreadth(allIndices = []) {
  if (!Array.isArray(allIndices)) {
    return {
      benchmarks: [],
      valuation: { pe: 0, pb: 0, dy: 0, status: "Normal" },
    };
  }

  const findIndex = (name) =>
    allIndices.find(
      (idx) => idx && (idx.index === name || idx.indexSymbol === name || String(idx.index).toUpperCase() === name.toUpperCase())
    );

  const n50 = findIndex("NIFTY 50");
  const n500 = findIndex("NIFTY 500");
  const mid100 = findIndex("NIFTY MIDCAP 100") || findIndex("NIFTY MIDCAP 50");
  const bank = findIndex("NIFTY BANK");

  const buildBenchmarkItem = (raw, label, icon) => {
    if (!raw) return null;
    const adv = parseInt(raw.advances || 0, 10) || 0;
    const dec = parseInt(raw.declines || 0, 10) || 0;
    const unch = parseInt(raw.unchanged || 0, 10) || 0;
    const total = adv + dec + unch || 1;
    const advPct = Number(((adv / total) * 100).toFixed(1));
    const decPct = Number(((dec / total) * 100).toFixed(1));

    return {
      label,
      symbol: raw.index || label,
      icon,
      last: Number((raw.last || 0).toFixed(2)),
      variation: Number((raw.variation || 0).toFixed(2)),
      percentChange: Number((raw.percentChange || 0).toFixed(2)),
      advances: adv,
      declines: dec,
      unchanged: unch,
      total,
      advancesPct: advPct,
      declinesPct: decPct,
      adRatio: dec > 0 ? Number((adv / dec).toFixed(2)) : adv,
    };
  };

  const benchmarks = [
    buildBenchmarkItem(n50, "NIFTY 50", "🇮🇳"),
    buildBenchmarkItem(n500, "NIFTY 500", "🌐"),
    buildBenchmarkItem(mid100, "NIFTY MIDCAP 100", "🚀"),
    buildBenchmarkItem(bank, "NIFTY BANK", "🏦"),
  ].filter(Boolean);

  // Valuation of NIFTY 50
  const pe = n50 ? parseFloat(n50.pe || 0) : 0;
  const pb = n50 ? parseFloat(n50.pb || 0) : 0;
  const dy = n50 ? parseFloat(n50.dy || 0) : 0;

  let valuationStatus = "Fair Value";
  let valuationBadge = "info";
  if (pe > 0 && pe < 18) {
    valuationStatus = "Undervalued / Attractive";
    valuationBadge = "success";
  } else if (pe >= 18 && pe <= 23) {
    valuationStatus = "Fair / Historical Median";
    valuationBadge = "info";
  } else if (pe > 23 && pe <= 26) {
    valuationStatus = "Mildly Elevated Valuation";
    valuationBadge = "warning";
  } else if (pe > 26) {
    valuationStatus = "Overvalued / Caution";
    valuationBadge = "danger";
  }

  return {
    benchmarks,
    valuation: {
      pe: Number(pe.toFixed(2)),
      pb: Number(pb.toFixed(2)),
      dy: Number(dy.toFixed(2)),
      status: valuationStatus,
      badgeColor: valuationBadge,
    },
  };
}

/**
 * Builds the complete macro sentiment payload with fallbacks and source success tracking.
 * @param {object} options
 * @param {object} [options.nseClient] - Injected NseIndia instance.
 * @param {object} [options.yfClient] - Injected YahooFinance instance.
 * @param {Function} [options.breadthFn] - Injected sector breadth function.
 * @returns {Promise<object>} Complete sentiment payload including hasAnySuccess flag.
 */
export async function executeFetchMacroSentiment({
  nseClient = defaultNseIndia,
  yfClient = defaultYahooFinance,
  breadthFn = null,
} = {}) {
  const sourcesSuccess = {
    fiiDii: false,
    indices: false,
    vix: false,
    breadth: false,
  };

  // 1. Fetch FII / DII data
  let rawFiiDii = [];
  try {
    const res = await nseClient.getDataByEndpoint("/api/fiidiiTradeReact");
    if (Array.isArray(res) && res.length > 0) {
      rawFiiDii = res;
      sourcesSuccess.fiiDii = true;
    }
  } catch (err) {
    console.warn("NSE FII/DII API unavailable, using fallback:", err.message);
  }
  const fiiDii = formatFiiDiiData(rawFiiDii);

  // 2. Fetch all indices for Breadth & Valuation
  let rawAllIndices = [];
  try {
    const indicesRes = await nseClient.getAllIndices();
    if (Array.isArray(indicesRes?.data) && indicesRes.data.length > 0) {
      rawAllIndices = indicesRes.data;
      sourcesSuccess.indices = true;
    }
  } catch (err) {
    console.warn("NSE getAllIndices API unavailable, using fallback:", err.message);
  }
  const { benchmarks, valuation } = formatIndexBreadth(rawAllIndices);

  // 3. Fetch India VIX via Yahoo Finance (with fallback to NSE index if available)
  let vixValue = 0;
  let vixChange = 0;
  let vixChangePct = 0;
  let vix52High = 0;
  let vix52Low = 0;
  let vixDayHigh = 0;
  let vixDayLow = 0;

  try {
    const vixQuote = await yfClient.quote("^INDIAVIX");
    if (vixQuote && Number(vixQuote.regularMarketPrice) > 0) {
      vixValue = Number(vixQuote.regularMarketPrice ?? 0);
      vixChange = Number(vixQuote.regularMarketChange ?? 0);
      vixChangePct = Number(vixQuote.regularMarketChangePercent ?? 0);
      vix52High = Number(vixQuote.fiftyTwoWeekHigh ?? 0);
      vix52Low = Number(vixQuote.fiftyTwoWeekLow ?? 0);
      vixDayHigh = Number(vixQuote.regularMarketDayHigh ?? 0);
      vixDayLow = Number(vixQuote.regularMarketDayLow ?? 0);
      sourcesSuccess.vix = true;
    }
  } catch (err) {
    console.warn("Yahoo Finance ^INDIAVIX fetch failed, attempting NSE index fallback:", err.message);
  }

  if (!sourcesSuccess.vix) {
    const nseVix = rawAllIndices.find((idx) => idx && (idx.index === "INDIA VIX" || idx.indexSymbol === "INDIA VIX"));
    if (nseVix && Number(nseVix.last) > 0) {
      vixValue = Number(nseVix.last ?? 0);
      vixChange = Number(nseVix.variation ?? 0);
      vixChangePct = Number(nseVix.percentChange ?? 0);
      vix52High = Number(nseVix.yearHigh ?? 0);
      vix52Low = Number(nseVix.yearLow ?? 0);
      vixDayHigh = Number(nseVix.high ?? 0);
      vixDayLow = Number(nseVix.low ?? 0);
      sourcesSuccess.vix = true;
    }
  }

  const vixRegime = classifyVixRegime(vixValue);

  // 4. Fetch Moving Average Breadth via Sector Breadth Service
  let dmaBreadth = {
    above50Pct: 0,
    above200Pct: 0,
    above50Count: 0,
    above200Count: 0,
    totalStocks: 0,
    breadthRegime: "Neutral",
    regimeColor: "neutral",
    near52WHighCount: 0,
    near52WLowCount: 0,
    netNewHighs: 0,
  };

  try {
    const sectorData = breadthFn
      ? await breadthFn()
      : await getSectorBreadthData({ forceRefresh: false, quoteClient: yfClient });
    if (sectorData?.breadth && (sectorData.breadth.totalStocks > 0 || sectorData.breadth.advances > 0)) {
      const b = sectorData.breadth;
      dmaBreadth = {
        above50Pct: b.above50Pct || 0,
        above200Pct: b.above200Pct || 0,
        above50Count: b.above50Count || 0,
        above200Count: b.above200Count || 0,
        totalStocks: b.totalStocks || 0,
        breadthRegime: b.breadthRegime || "Neutral",
        regimeColor: b.regimeColor || "neutral",
        near52WHighCount: b.near52WHighCount || 0,
        near52WLowCount: b.near52WLowCount || 0,
        netNewHighs: b.netNewHighs || 0,
      };
      sourcesSuccess.breadth = true;
    }
  } catch (err) {
    console.warn("Sector breadth fetch for DMA calculation failed:", err.message);
  }

  const hasAnySuccess =
    sourcesSuccess.fiiDii ||
    sourcesSuccess.indices ||
    sourcesSuccess.vix ||
    sourcesSuccess.breadth;

  return {
    timestamp: new Date().toISOString(),
    isCached: false,
    cacheAgeSeconds: 0,
    hasAnySuccess,
    sourcesSuccess,
    vix: {
      value: Number(vixValue.toFixed(2)),
      change: Number(vixChange.toFixed(2)),
      changePercent: Number(vixChangePct.toFixed(2)),
      dayHigh: Number(vixDayHigh.toFixed(2)),
      dayLow: Number(vixDayLow.toFixed(2)),
      fiftyTwoWeekHigh: Number(vix52High.toFixed(2)),
      fiftyTwoWeekLow: Number(vix52Low.toFixed(2)),
      regime: vixRegime,
    },
    fiiDii,
    benchmarks,
    valuation,
    dmaBreadth,
  };
}

/**
 * Public accessor for Macro Sentiment Data.
 * Handles in-memory caching, forced refresh throttling, and deduplication.
 * Rejects caching when all upstream sources fail to prevent overwriting valid data with zeroes.
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @param {object} [options.nseClient]
 * @param {object} [options.yfClient]
 * @param {Function} [options.breadthFn]
 * @returns {Promise<object>} Complete sentiment payload.
 */
export async function getMacroSentimentData({
  forceRefresh = false,
  bypassCooldown = false,
  nseClient = defaultNseIndia,
  yfClient = defaultYahooFinance,
  breadthFn = null,
} = {}) {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedSentimentData &&
    now - lastFetchTimestamp < CACHE_TTL_MS
  ) {
    return {
      ...cachedSentimentData,
      isCached: true,
      cacheAgeSeconds: Math.floor((now - lastFetchTimestamp) / 1000),
    };
  }

  if (
    forceRefresh &&
    !bypassCooldown &&
    now - lastFetchTimestamp < MIN_REFRESH_COOLDOWN_MS &&
    cachedSentimentData
  ) {
    return {
      ...cachedSentimentData,
      isCached: true,
      isThrottled: true,
      cacheAgeSeconds: Math.floor((now - lastFetchTimestamp) / 1000),
    };
  }

  if (pendingFetchPromise) {
    return pendingFetchPromise;
  }

  pendingFetchPromise = (async () => {
    try {
      const data = await executeFetchMacroSentiment({ nseClient, yfClient, breadthFn });
      if (!data.hasAnySuccess) {
        throw new Error("All macro sentiment upstream sources failed");
      }
      cachedSentimentData = data;
      lastFetchTimestamp = Date.now();
      return {
        ...data,
        isCached: false,
        cacheAgeSeconds: 0,
      };
    } catch (error) {
      if (cachedSentimentData) {
        console.warn("Failed to fetch fresh macro sentiment data, serving stale cache:", error.message);
        return {
          ...cachedSentimentData,
          isCached: true,
          isStale: true,
          cacheAgeSeconds: Math.floor((Date.now() - lastFetchTimestamp) / 1000),
        };
      }
      throw error;
    } finally {
      pendingFetchPromise = null;
    }
  })();

  return pendingFetchPromise;
}

/**
 * Resets the in-memory cache (primarily used for unit testing).
 */
export function resetSentimentCache() {
  cachedSentimentData = null;
  lastFetchTimestamp = 0;
  pendingFetchPromise = null;
}
