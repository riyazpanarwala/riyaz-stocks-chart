// src/services/market/nextDayOptionSignalService.js
// ═══════════════════════════════════════════════════════════════════════════
// NIFTY NEXT-DAY OPTION SIGNAL SERVICE
// ═══════════════════════════════════════════════════════════════════════════
// Fetches live/3:15 PM NIFTY option-chain & price data, coordinates analysis,
// and manages local reports and caching.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs/promises";
import path from "node:path";
import { NseIndia } from "stock-nse-india";
import YahooFinance from "yahoo-finance2";
import {
  generate315NextDayOptionSignal,
  formatNextDaySignalFull,
  formatNextDaySignalTelegram,
} from "../../engine/options/nextDayOptionSignalEngine.js";
import { sendTelegramMessage } from "../notification/telegramNotifier.js";

const defaultNseIndia = new NseIndia();
const defaultYahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// In-memory cache for the 3:15 PM signal (5-minute TTL during session, persistent for the day post 3:30)
let cachedDailySignal = null;
let lastSignalFetchTime = 0;
const SIGNAL_CACHE_TTL_MS = 5 * 60 * 1000;

export function resetSignalCache() {
  cachedDailySignal = null;
  lastSignalFetchTime = 0;
}

/**
 * Returns today's IST date string in YYYY-MM-DD format.
 * @returns {string}
 */
export function getIstDateString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns current IST time formatted as HH:mm:ss.
 * @returns {string}
 */
export function getIstTimeString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch (e) {
    return "15:15:00";
  }
}

/**
 * Fetches the latest NIFTY Option Chain and Spot Data, then computes the 3:15 PM signal.
 * Never fabricates values. If data is unavailable, returns a clean "DATA_UNAVAILABLE" payload.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @param {boolean} [options.dispatchTelegram=false]
 * @param {boolean} [options.saveReport=true]
 * @param {object} [options.nseClient] Optional injected NSE client for mocking
 * @param {object} [options.yfClient] Optional injected YahooFinance client for mocking
 * @returns {Promise<{
 *   result: object,
 *   fullReport: string,
 *   telegramText: string,
 *   telegramSent?: boolean,
 *   savedPath?: string
 * }>}
 */
export async function getNextDayOptionSignal({
  forceRefresh = false,
  dispatchTelegram = false,
  saveReport = true,
  nseClient = defaultNseIndia,
  yfClient = defaultYahooFinance,
} = {}) {
  const now = Date.now();
  const todayStr = getIstDateString();

  if (
    !forceRefresh &&
    cachedDailySignal &&
    cachedDailySignal.dateKey === todayStr &&
    now - lastSignalFetchTime < SIGNAL_CACHE_TTL_MS
  ) {
    return cachedDailySignal.payload;
  }

  // 1. Fetch Option Chain from NSE
  let rawOptionChain = null;
  try {
    rawOptionChain = await nseClient.getIndexOptionChain("NIFTY");
  } catch (err) {
    console.warn("[getNextDayOptionSignal] NSE getIndexOptionChain failed:", err.message);
  }

  // 2. Fetch Spot Price & Intraday Candles
  let spotPrice = 0;
  let dayOpen = 0;
  let dayHigh = 0;
  let dayLow = 0;
  let prevClose = 0;
  let intradayCandles = [];

  // Try extracting underlyingValue from option chain first
  if (rawOptionChain?.records?.underlyingValue) {
    spotPrice = Number(rawOptionChain.records.underlyingValue);
  }

  // Supplement with Yahoo Finance ^NSEI quote for open, high, low, prevClose, and intraday candles
  try {
    const quote = await yfClient.quote("^NSEI");
    if (quote) {
      if (!spotPrice || spotPrice <= 0) {
        spotPrice = Number(quote.regularMarketPrice) || 0;
      }
      dayOpen = Number(quote.regularMarketOpen) || spotPrice;
      dayHigh = Number(quote.regularMarketDayHigh) || spotPrice;
      dayLow = Number(quote.regularMarketDayLow) || spotPrice;
      prevClose = Number(quote.regularMarketPreviousClose) || spotPrice;
    }
  } catch (err) {
    console.warn("[getNextDayOptionSignal] YF quote failed:", err.message);
  }

  // Fetch 5-minute candles for VWAP & price action structure
  try {
    const todayStart = new Date(`${todayStr}T09:15:00+05:30`);
    const chartRes = await yfClient.chart("^NSEI", {
      interval: "5m",
      period1: todayStart.toISOString(),
    });
    if (chartRes?.quotes?.length) {
      intradayCandles = chartRes.quotes.filter((q) => q.close != null);
    }
  } catch (err) {
    // Non-fatal: calculateVWAP gracefully falls back to null
  }

  // If spot price or option chain is missing, return cleanly with DATA_UNAVAILABLE
  if (!rawOptionChain || !rawOptionChain.records || !spotPrice || spotPrice <= 0) {
    const unavailableSignal = generate315NextDayOptionSignal({
      optionChain: null,
      spotData: null,
      analysisDate: todayStr,
    });

    const fullReport = formatNextDaySignalFull(unavailableSignal);
    const telegramText = formatNextDaySignalTelegram(unavailableSignal);

    return {
      result: unavailableSignal,
      fullReport,
      telegramText,
      telegramSent: false,
    };
  }

  // Normalize rawOptionChain for the engine
  const rec = rawOptionChain.records;
  const filteredData = (rec.data ?? []).filter((r) => r.CE || r.PE);
  const normalizedChain = {
    underlyingValue: spotPrice,
    expiry: rec.expiryDates?.[0] ?? null,
    displayData: filteredData,
    fullOI: filteredData.map((r) => ({
      s: r.strikePrice,
      c: r.CE?.openInterest ?? 0,
      p: r.PE?.openInterest ?? 0,
    })),
  };

  const spotData = {
    spot: spotPrice,
    open: dayOpen || spotPrice,
    high: dayHigh || spotPrice,
    low: dayLow || spotPrice,
    prevClose: prevClose || spotPrice,
    vwap: null, // Engine will calculate from intradayCandles if present
  };

  // 3. Run Analysis Engine
  const signalResult = generate315NextDayOptionSignal({
    optionChain: normalizedChain,
    spotData,
    intradayCandles,
    analysisDate: todayStr,
    expiry: rec.expiryDates?.[0],
  });

  const fullReport = formatNextDaySignalFull(signalResult);
  const telegramText = formatNextDaySignalTelegram(signalResult);

  // 4. Dispatch Telegram Notification if requested
  let telegramSent = false;
  if (dispatchTelegram) {
    const tgRes = await sendTelegramMessage(telegramText);
    telegramSent = tgRes.sent;
  }

  // 5. Save report to disk if requested
  let savedPath = null;
  if (saveReport) {
    try {
      const reportsDir = path.resolve(process.cwd(), "reports", "next-day-signals");
      await fs.mkdir(reportsDir, { recursive: true });

      const filename = `next-day-signal-${todayStr}.json`;
      const mdFilename = `next-day-signal-${todayStr}.md`;
      savedPath = path.join(reportsDir, filename);

      await fs.writeFile(savedPath, JSON.stringify(signalResult, null, 2), "utf8");
      await fs.writeFile(path.join(reportsDir, mdFilename), fullReport, "utf8");
    } catch (saveErr) {
      console.warn("[getNextDayOptionSignal] Failed to save report:", saveErr.message);
    }
  }

  const payload = {
    result: signalResult,
    fullReport,
    telegramText,
    telegramSent,
    savedPath,
  };

  cachedDailySignal = {
    dateKey: todayStr,
    payload,
  };
  lastSignalFetchTime = now;

  return payload;
}
