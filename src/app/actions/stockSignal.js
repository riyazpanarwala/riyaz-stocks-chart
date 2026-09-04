"use server";

import { analyzeStock, formatCompactAnalysis, formatIstTimestamp } from "../../engine/quick/analyzeStock.js";
import { isLikelyNseMarketOpen } from "../../engine/quick/analyzeStock.js";

// ── In-Memory Response Caching & Request Deduplication ──
const signalCache = new Map();
const inFlightRequests = new Map();

function getAdaptiveTtlMs() {
  const isMarketOpen = isLikelyNseMarketOpen();
  return isMarketOpen ? 5 * 60 * 1000 : 60 * 60 * 1000;
}

function getCachedSignal(cacheKey) {
  const entry = signalCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    signalCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedSignal(cacheKey, data, ttlMs = getAdaptiveTtlMs()) {
  signalCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });

  if (signalCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of signalCache.entries()) {
      if (now > v.expiresAt) signalCache.delete(k);
    }
  }
}

async function deduplicateRequest(cacheKey, fetchFn) {
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      return await fetchFn();
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Next.js Server Action: getStockSignalAction
 * Invoked securely by the frontend component without exposing an open public REST URL.
 * @param {Object} params Action parameters
 * @param {string} params.symbol Stock symbol or instrument key
 * @param {string} [params.exchange] Exchange name ("NSE" or "BSE")
 * @param {boolean} [params.holding=false] Whether position is currently held
 * @param {string} [params.timeframe="1d"] Analysis timeframe
 * @param {Object} [params.analyzeOverrides] Optional analysis overrides (mock downloader, etc.)
 * @returns {Promise<Object>} Formatted signal and performance response
 */
export async function getStockSignalAction({
  symbol: rawSymbol,
  exchange: rawExchange,
  holding = false,
  timeframe = "1d",
  downloader,
  intradayFetcher,
  strategyConfig,
  fromDate,
  toDate,
  lookbackCalendarDays,
  includeLiveCandle,
  liveIntervalMinutes,
  now,
} = {}) {
  try {
    // 1. Input Validation
    const target = (rawSymbol || "").trim();
    if (!target) {
      return {
        success: false,
        error: "Stock symbol or instrument key is required.",
      };
    }

    if (!/^[A-Za-z0-9\-_|.:&]{1,40}$/.test(target)) {
      return {
        success: false,
        error: "Invalid symbol format.",
      };
    }

    const positionState = holding ? "LONG" : "FLAT";
    const exchange = rawExchange ? (rawExchange.toUpperCase().startsWith("BSE") ? "BSE" : "NSE") : undefined;

    // 2. Cache Lookup (incorporates all result-affecting analysis options)
    const cacheKeyParts = [
      target.toUpperCase(),
      exchange || "DEFAULT",
      positionState,
      timeframe,
      fromDate || "",
      toDate || "",
      lookbackCalendarDays != null ? String(lookbackCalendarDays) : "",
      includeLiveCandle != null ? String(includeLiveCandle) : "",
      liveIntervalMinutes != null ? String(liveIntervalMinutes) : "",
      strategyConfig ? JSON.stringify(strategyConfig) : "",
      now ? (now instanceof Date ? now.toISOString() : String(now)) : "",
      downloader ? "custom-downloader" : "",
      intradayFetcher ? "custom-intraday" : "",
    ];
    const cacheKey = cacheKeyParts.join(":");

    const cachedResponse = getCachedSignal(cacheKey);
    if (cachedResponse) {
      return {
        success: true,
        cached: true,
        data: cachedResponse,
      };
    }

    // 3. Forward whitelisted options with normalized fields strictly overriding
    const analysisOptions = {
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(lookbackCalendarDays != null ? { lookbackCalendarDays } : {}),
      ...(includeLiveCandle != null ? { includeLiveCandle } : {}),
      ...(liveIntervalMinutes != null ? { liveIntervalMinutes } : {}),
      ...(strategyConfig ? { strategyConfig } : {}),
      ...(downloader ? { downloader } : {}),
      ...(intradayFetcher ? { intradayFetcher } : {}),
      ...(now ? { now } : {}),
      positionState,
      exchange,
      timeframe,
    };

    // 4. Deduplicated Execution (Prevents multiple simultaneous Upstox hits for same stock)
    const result = await deduplicateRequest(cacheKey, async () => {
      return await analyzeStock(target, analysisOptions);
    });

    const responseData = {
      instrument: result.instrument,
      timeframe: result.timeframe,
      range: result.range,
      candleStatus: result.candleStatus,
      signal: result.signal,
      signalPerformance: result.signalPerformance,
      liveCandle: result.liveCandle,
      formattedAnalysis: formatCompactAnalysis(result),
      formattedTimestamp: formatIstTimestamp(result.signal.timestamp),
      formattedTriggerTimestamp: result.signalPerformance?.triggerTimestamp
        ? formatIstTimestamp(result.signalPerformance.triggerTimestamp)
        : null,
    };

    setCachedSignal(cacheKey, responseData);

    return {
      success: true,
      cached: false,
      data: responseData,
    };
  } catch (error) {
    console.error("[stockSignalAction] Error analyzing stock:", error);
    return {
      success: false,
      error: error.message || "Failed to analyze stock signal",
    };
  }
}
