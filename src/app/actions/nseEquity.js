"use server";

import { NseIndia } from "stock-nse-india";

const nseIndia = new NseIndia();

const VALID_API_NAMES = new Set([
  "tradeInfo",
  "corporateInfo",
  "details",
  "intraday",
  "historic",
  "indexIntraday",
  "F&O",
  "indexHistoric",
  "optionChain",
  "indicators",
]);

/**
 * Server Action: getNseEquityAction
 * Replaces public /api/NSE/Equity endpoint.
 * Protected by Next.js Server Action CSRF and execution semantics.
 */
export async function getNseEquityAction({
  symbol: rawSymbol,
  apiName,
  fromDate,
  toDate,
} = {}) {
  try {
    const symbol = typeof rawSymbol === "string" ? rawSymbol.trim() : "";

    if (!symbol || !/^[A-Za-z0-9\-\.\s&%]+$/.test(symbol)) {
      return { error: "Invalid or missing symbol parameter." };
    }

    if (!apiName || !VALID_API_NAMES.has(apiName)) {
      return {
        error: `Invalid apiName parameter. Must be one of: ${Array.from(VALID_API_NAMES).join(", ")}`,
      };
    }

    let data = {};
    if (apiName === "tradeInfo") {
      data = await nseIndia.getEquityTradeInfo(symbol);
    } else if (apiName === "corporateInfo") {
      data = await nseIndia.getEquityCorporateInfo(symbol);
    } else if (apiName === "details") {
      data = await nseIndia.getEquityDetails(symbol);
    } else if (apiName === "intraday") {
      data = await nseIndia.getEquityIntradayData(symbol);
    } else if (apiName === "historic") {
      const range = { start: fromDate, end: toDate };
      data = await nseIndia.getEquityHistoricalData(symbol, range);
    } else if (apiName === "indexIntraday") {
      data = await nseIndia.getIndexIntradayData(symbol);
    } else if (apiName === "F&O") {
      data = await nseIndia.getIndexOptionChain(symbol);
    } else if (apiName === "indexHistoric") {
      const range = { start: fromDate, end: toDate };
      data = await nseIndia.getIndexHistoricalData(symbol, range);
    } else if (apiName === "optionChain") {
      data = await nseIndia.getEquityOptionChain(symbol);
    } else if (apiName === "indicators") {
      data = await nseIndia.getTechnicalIndicators(symbol);
    }

    return data ?? {};
  } catch (error) {
    console.error("[getNseEquityAction] Error processing NSE request:", error);
    return { error: error.message || "Failed to process NSE request" };
  }
}
