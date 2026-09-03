import YahooFinance from "yahoo-finance2";
import { extractFinancials } from "./extractFinancials.js";
import { getCachedData, setCachedData } from "./CachedFinancialData.js";

const yahooFinance = new YahooFinance();

export async function getQuoteSummary(symbol) {
  const cached = getCachedData(symbol);
  if (cached) {
    return { ...cached };
  }

  const queryOptions = {
    modules: [
      "defaultKeyStatistics",
      "price",
      "financialData",
      "summaryDetail",
    ],
  };

  const data = await yahooFinance.quoteSummary(symbol, queryOptions);
  const extracted = extractFinancials(data);

  if (extracted) {
    const snapshot = { ...extracted };
    setCachedData(symbol, snapshot);
    return { ...snapshot };
  }

  return extracted;
}
