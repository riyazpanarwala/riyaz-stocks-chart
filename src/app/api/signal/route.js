import { NextResponse } from "next/server";
import { analyzeStock, formatCompactAnalysis, formatIstTimestamp } from "@/engine/quick/analyzeStock.js";
import { resolveInstrument } from "@/engine/config/quickAnalysis.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolParam = searchParams.get("symbol") || searchParams.get("symbolOrKey");
    const exchangeParam = searchParams.get("exchange");
    const holdingParam = searchParams.get("holding");
    const timeframeParam = searchParams.get("timeframe") || "1d";
    const instrumentKeyParam = searchParams.get("instrumentKey");

    const target = instrumentKeyParam || symbolParam;

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbol or instrumentKey is required. Example: /api/signal?symbol=TCS",
        },
        { status: 400 }
      );
    }

    const positionState = holdingParam === "true" || holdingParam === "1" ? "LONG" : "FLAT";
    const exchange = exchangeParam ? exchangeParam.toUpperCase() : undefined;

    const result = await analyzeStock(target, {
      positionState,
      exchange,
      timeframe: timeframeParam,
    });

    return NextResponse.json({
      success: true,
      data: {
        instrument: result.instrument,
        timeframe: result.timeframe,
        range: result.range,
        candleStatus: result.candleStatus,
        signal: result.signal,
        liveCandle: result.liveCandle,
        formattedAnalysis: formatCompactAnalysis(result),
        formattedTimestamp: formatIstTimestamp(result.signal.timestamp),
      },
    });
  } catch (error) {
    console.error("[api/signal] Error analyzing stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to analyze stock signal",
      },
      { status: 500 }
    );
  }
}
