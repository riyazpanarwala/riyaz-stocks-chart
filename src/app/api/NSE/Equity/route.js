import { NseIndia } from "stock-nse-india";
import { NextResponse } from "next/server";
const nseIndia = new NseIndia();

export async function POST(req) {
  // Parse the request body
  try {
    const { symbol, apiName, fromDate, toDate } = await req.json();
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
      const range = {
        start: fromDate,
        end: toDate,
      };
      data = await nseIndia.getEquityHistoricalData(symbol, range);
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
