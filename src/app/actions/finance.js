"use server";

import { getQuoteSummary } from "../../services/finance/quoteService.js";
import { getChartData } from "../../services/finance/chartService.js";

/**
 * Server Action: getFinanceDataAction
 * Replaces public /api/finance endpoint.
 * Directly queried by Chart & Fundamentals components.
 */
export async function getFinanceDataAction({
  symbol: rawSymbol,
  isQuote = false,
  interval,
  fromDate,
  toDate,
} = {}) {
  try {
    const symbol = typeof rawSymbol === "string" ? rawSymbol.trim() : "";

    if (!symbol || !/^[A-Za-z0-9.\-^=]+$/.test(symbol)) {
      return { error: "Invalid or missing symbol." };
    }

    if (isQuote) {
      const data = await getQuoteSummary(symbol);
      return data ?? {};
    } else {
      const data = await getChartData(symbol, { interval, fromDate, toDate });
      return data ?? [];
    }
  } catch (error) {
    console.error("[getFinanceDataAction] Error:", error);
    return { error: error.message || "Failed to process finance request" };
  }
}
