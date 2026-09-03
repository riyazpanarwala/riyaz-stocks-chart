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
 */
export async function getStockSignalAction({
  symbol: rawSymbol,
  exchange: rawExchange,
  holding = false,
  timeframe = "1d",
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

    if (!/^[A-Za-z0-9\-_|.:]{1,40}$/.test(target)) {
      return {
        success: false,
        error: "Invalid symbol format.",
      };
    }

    const positionState = holding ? "LONG" : "FLAT";
    const exchange = rawExchange ? (rawExchange.toUpperCase().startsWith("BSE") ? "BSE" : "NSE") : undefined;

    // 2. Cache Lookup (returns in < 1ms if analyzed within 5 mins during market hours)
    const cacheKey = `${target.toUpperCase()}:${exchange || "DEFAULT"}:${positionState}:${timeframe}`;
    const cachedResponse = getCachedSignal(cacheKey);
    if (cachedResponse) {
      return {
        success: true,
        cached: true,
        data: cachedResponse,
      };
    }

    // 3. Deduplicated Execution (Prevents multiple simultaneous Upstox hits for same stock)
    const result = await deduplicateRequest(cacheKey, async () => {
      return await analyzeStock(target, {
        positionState,
        exchange,
        timeframe,
      });
    });

    const responseData = {
      instrument: result.instrument,
      timeframe: result.timeframe,
      range: result.range,
      candleStatus: result.candleStatus,
      signal: result.signal,
      liveCandle: result.liveCandle,
      formattedAnalysis: formatCompactAnalysis(result),
      formattedTimestamp: formatIstTimestamp(result.signal.timestamp),
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
