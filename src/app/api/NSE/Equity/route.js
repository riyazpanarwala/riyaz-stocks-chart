import { NseIndia } from "stock-nse-india";
import { NextResponse } from "next/server";

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

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { symbol, apiName, fromDate, toDate } = body;

    if (!symbol || typeof symbol !== "string" || !/^[A-Za-z0-9\-\.\s&%]+$/.test(symbol)) {
      return NextResponse.json(
        { error: "Invalid or missing symbol parameter." },
        { status: 400 }
      );
    }

    if (!apiName || !VALID_API_NAMES.has(apiName)) {
      return NextResponse.json(
        { error: `Invalid apiName parameter. Must be one of: ${Array.from(VALID_API_NAMES).join(", ")}` },
        { status: 400 }
      );
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

    return NextResponse.json(data ?? {}, { status: 200 });
  } catch (error) {
    console.error("Error processing NSE request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
