import { NextResponse } from "next/server";
import { getQuoteSummary } from "./Services/quoteService";
import { getChartData } from "./Services/chartService";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const isQuote = searchParams.get("isQuote") === "true";

    if (!symbol || !/^[A-Za-z0-9.\-^=]+$/.test(symbol)) {
      return NextResponse.json(
        { error: "Invalid or missing symbol." },
        { status: 400 }
      );
    }

    let data;
    if (isQuote) {
      data = await getQuoteSummary(symbol);
    } else {
      const interval = searchParams.get("interval");
      const fromDate = searchParams.get("fromDate");
      const toDate = searchParams.get("toDate");

      data = await getChartData(symbol, { interval, fromDate, toDate });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
