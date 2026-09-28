"use server";

import { getQuoteSummary, getHistoricalFinancials } from "../../services/finance/quoteService.js";
import { getChartData, getCorporateActions } from "../../services/finance/chartService.js";

/**
 * Server Action: getFinanceDataAction
 * Replaces public /api/finance endpoint.
 * Directly queried by Chart & Fundamentals components.
 */
export async function getFinanceDataAction({
  symbol: rawSymbol,
  isQuote = false,
  isHistoricalFinancials = false,
  financialsType = "quarterly",
  corporateActionsOnly = false,
  interval,
  fromDate,
  toDate,
} = {}) {
  try {
    const symbol = typeof rawSymbol === "string" ? rawSymbol.trim() : "";

    if (!symbol || !/^[A-Za-z0-9.\-^=]+$/.test(symbol)) {
      return { error: "Invalid or missing symbol." };
    }

    if (corporateActionsOnly) {
      return await getCorporateActions(symbol, { fromDate, toDate });
    }
    if (isHistoricalFinancials) {
      const data = await getHistoricalFinancials(symbol, financialsType);
      return data ?? [];
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
