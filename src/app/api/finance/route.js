import { NextResponse } from "next/server";
// import axios from "axios";
// import moment from "moment";
import yahooFinance from "yahoo-finance2";

const round2Decimal = (value) => {
  return parseFloat((Math.round(value * 100) / 100).toFixed(2), 10);
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const interval = searchParams.get("interval");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const queryObj = {
      interval,
      period1: fromDate,
    };

    if (toDate) {
      queryObj.period2 = toDate;
    }

    const result = await yahooFinance.chart(symbol, queryObj);
    const data = result.quotes.filter((v) => v.close !== null);

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
