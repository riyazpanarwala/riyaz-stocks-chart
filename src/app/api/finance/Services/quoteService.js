import yahooFinance from "yahoo-finance2";
import { extractFinancials } from "../utils/extractFinancials";
import {
  getCachedData,
  setCachedData,
} from "../../Fundamentals/CachedFinancialData";

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
