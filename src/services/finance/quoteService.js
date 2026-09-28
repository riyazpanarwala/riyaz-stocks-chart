import YahooFinance from "yahoo-finance2";
import { extractFinancials } from "./extractFinancials.js";
import { getCachedData, setCachedData } from "./CachedFinancialData.js";

const yahooFinance = new YahooFinance();


/**
 * Formats a period label based on date and period type
 * For annual: FY25
 * For quarterly: Q1 FY26 (Jun '25)
 */
function formatPeriodLabel(dateStr, isAnnual) {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0 = Jan, 11 = Dec
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const mName = monthNames[month] || "";
  const yy = String(year).slice(-2);

  if (isAnnual) {
    return `FY${yy}`;
  }

  // Quarterly Indian FY alignment (April - March)
  let qLabel = "";
  if (month <= 2) {
    qLabel = `Q4 FY${yy}`;
  } else if (month <= 5) {
    qLabel = `Q1 FY${String(year + 1).slice(-2)}`;
  } else if (month <= 8) {
    qLabel = `Q2 FY${String(year + 1).slice(-2)}`;
  } else {
    qLabel = `Q3 FY${String(year + 1).slice(-2)}`;
  }

  return `${qLabel} (${mName} '${yy})`;
}

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

/**
 * Fetch multi-period historical fundamentals (revenue, profits, margins, EPS)
 * Supports 'quarterly' and 'annual' periods with 6-hour caching.
 */
export async function getHistoricalFinancials(symbol, type = "quarterly") {
  const normalizedType = type === "annual" ? "annual" : "quarterly";
  const cacheKey = `${symbol}:historical:${normalizedType}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const rawData = await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1: "2020-01-01",
      type: normalizedType,
      module: "financials",
    });

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    // Filter out empty rows and sort chronologically (oldest to newest)
    const validRows = rawData
      .filter((r) => r && (r.totalRevenue || r.operatingRevenue || r.netIncome || r.operatingIncome))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const processed = validRows.map((row) => {
      const d = new Date(row.date);
      const isAnnual = row.periodType === "12M" || normalizedType === "annual";
      const periodLabel = formatPeriodLabel(row.date, isAnnual);

      const totalRevenue = row.totalRevenue ?? row.operatingRevenue ?? null;
      const operatingIncome = row.operatingIncome ?? null;
      const netIncome = row.netIncome ?? row.netIncomeCommonStockholders ?? null;
      const ebitda = row.EBITDA ?? row.normalizedEBITDA ?? null;
      const grossProfit = row.grossProfit ?? null;
      const eps = row.dilutedEPS ?? row.basicEPS ?? null;

      // Values in ₹ Crores (1 Cr = 1e7)
      const revenueCr = totalRevenue != null ? Number((totalRevenue / 1e7).toFixed(2)) : null;
      const operatingIncomeCr = operatingIncome != null ? Number((operatingIncome / 1e7).toFixed(2)) : null;
      const netIncomeCr = netIncome != null ? Number((netIncome / 1e7).toFixed(2)) : null;
      const ebitdaCr = ebitda != null ? Number((ebitda / 1e7).toFixed(2)) : null;
      const grossProfitCr = grossProfit != null ? Number((grossProfit / 1e7).toFixed(2)) : null;

      // Margins in %
      const operatingMarginPct =
        totalRevenue && operatingIncome
          ? Number(((operatingIncome / totalRevenue) * 100).toFixed(2))
          : null;
      const netMarginPct =
        totalRevenue && netIncome
          ? Number(((netIncome / totalRevenue) * 100).toFixed(2))
          : null;
      const ebitdaMarginPct =
        totalRevenue && ebitda
          ? Number(((ebitda / totalRevenue) * 100).toFixed(2))
          : null;
      const grossMarginPct =
        totalRevenue && grossProfit
          ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
          : null;

      return {
        date: d.toISOString().slice(0, 10),
        periodLabel,
        periodType: row.periodType,
        revenueCr,
        operatingIncomeCr,
        netIncomeCr,
        ebitdaCr,
        grossProfitCr,
        eps: eps != null ? Number(eps.toFixed(2)) : null,
        operatingMarginPct,
        netMarginPct,
        ebitdaMarginPct,
        grossMarginPct,
        revenueGrowthPct: null,
        netIncomeGrowthPct: null,
      };
    });

    // Compute period-over-period growth rates
    for (let i = 0; i < processed.length; i++) {
      const cur = processed[i];
      const prev = i > 0 ? processed[i - 1] : null;

      if (prev && prev.revenueCr && prev.revenueCr > 0 && cur.revenueCr != null) {
        cur.revenueGrowthPct = Number(
          (((cur.revenueCr - prev.revenueCr) / Math.abs(prev.revenueCr)) * 100).toFixed(1)
        );
      }
      if (prev && prev.netIncomeCr != null && prev.netIncomeCr !== 0 && cur.netIncomeCr != null) {
        cur.netIncomeGrowthPct = Number(
          (((cur.netIncomeCr - prev.netIncomeCr) / Math.abs(prev.netIncomeCr)) * 100).toFixed(1)
        );
      }
    }

    setCachedData(cacheKey, processed, 1000 * 60 * 60 * 6); // Cache for 6 hours
    return processed;
  } catch (error) {
    console.error(`[getHistoricalFinancials] Error fetching for ${symbol}:`, error.message);
    return [];
  }
}

