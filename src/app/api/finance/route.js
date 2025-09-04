import { NextResponse } from "next/server";
// import axios from "axios";
// import moment from "moment";
import yahooFinance from "yahoo-finance2";
import {
  getCachedData,
  setCachedData,
} from "../Fundamentals/CachedFinancialData";

const round2Decimal = (value) => {
  return parseFloat((Math.round(value * 100) / 100).toFixed(2), 10);
};

export function extractFinancials(data) {
  const { price, defaultKeyStatistics, financialData } = data || {};

  const { regularMarketPrice, marketCap } = price || {};
  const {
    netIncomeToCommon,
    sharesOutstanding,
    trailingEps,
    bookValue,
  } = defaultKeyStatistics;
  const { totalDebt, debtToEquity } = financialData || {};

  // Market Cap in Crores (1 Cr = 1e7)
  const marketCapCr = marketCap / 1e7;

  // EPS Calculation
  const eps =
    netIncomeToCommon && sharesOutstanding
      ? netIncomeToCommon / sharesOutstanding
      : trailingEps;

  // PE Ratio
  const peRatio = eps && eps > 0 ? regularMarketPrice / eps : null;

  // Recalculate Book Value (approx)
  // Yahoo gives bookValue per share, but we try to recompute using debt + equity logic
  let recalculatedBookValue = null;
  if (sharesOutstanding && totalDebt && debtToEquity) {
    // Equity = Debt / (D/E ratio)
    const equity = totalDebt / debtToEquity;
    recalculatedBookValue = (equity * 100) / sharesOutstanding;
  }

  // Format everything to 2 decimals
  const format = (val) =>
    val !== null && val !== undefined ? val.toFixed(2) : "N/A";

  return {
    "Price (₹)": format(regularMarketPrice),
    "Market Cap (Cr)": format(marketCapCr),
    "EPS (TTM)": format(eps),
    "PE (TTM)": format(peRatio),
    "Book Value (Recalc)": format(recalculatedBookValue),
    "Book Value (Reported)": bookValue,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const interval = searchParams.get("interval");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const isQuote = searchParams.get("isQuote") === "true";

    if (!symbol || !/^[A-Za-z0-9.\-^=]+$/.test(symbol)) {
      return NextResponse.json(
        { error: "Invalid or missing symbol." },
        { status: 400 }
      );
    }

    const queryObj = {
      interval,
      period1: fromDate,
    };

    if (toDate) {
      queryObj.period2 = toDate;
    }

    let data;
    if (isQuote) {
      const cached = getCachedData(symbol);
      if (cached) {
        return NextResponse.json(
          { ...cached, fromCache: true },
          { status: 200 }
        );
      }

      const queryOptions = {
        modules: [
          "defaultKeyStatistics",
          "price",
          "financialData",
          "summaryDetail",
        ],
      };
      const data1 = await yahooFinance.quoteSummary(symbol, queryOptions);

      data = extractFinancials(data1);

      if (data) {
        setCachedData(symbol, data);
      }
      // const queryOptions = { lang: "en-US", reportsCount: 5 };
      // data = await yahooFinance.insights(symbol, queryOptions);
    } else {
      const result = await yahooFinance.chart(symbol, queryObj);
      data = result.quotes.filter((v) => v.close !== null);
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // Handle errors
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

/*
export async function POST(req) {
  // Parse the request body
  try {
    const {
      symbol = "^NSEI",
      interval = "1d",
      range = "1y",
    } = await req.json();
    let data = {};

    // const symbol = "^NSEI"; // Nifty 50 index symbol
    // const interval = "1d"; // Options: "1m", "5m", "1h", "1d", "1wk"
    // const range = "6mo"; // Options: "1d", "5d", "1mo", "6mo", "1y", "5y", "max"
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    const response = await axios.get(url);
    const result = response.data.chart.result[0];

    const timestamps = result.timestamp;
    const indicators = result.indicators.quote[0];

    data = timestamps
      .map((timestamp, index) => {
        return {
          timestamp,
          date: moment.unix(timestamp).format("YYYY-MM-DD hh:mm:ss"),
          open: round2Decimal(indicators.open[index]),
          high: round2Decimal(indicators.high[index]),
          low: round2Decimal(indicators.low[index]),
          close: round2Decimal(indicators.close[index]),
          volume: indicators.volume[index],
        };
      })
      .filter((v) => v.close !== 0);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // Handle errors
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
*/
