import { NextResponse } from "next/server";
import { NseIndia } from "stock-nse-india";
import { getCachedData, setCachedData } from "./CachedFinancialData";
const nseIndia = new NseIndia();

function calculateMetrics(financialResults, issuedSize, currentPrice) {
  if (!Array.isArray(financialResults) || financialResults.length < 4) {
    const marketCapCrVal =
      issuedSize && currentPrice
        ? Number(((issuedSize * currentPrice) / 1e7).toFixed(2)) + " Cr"
        : "0 Cr";
    return {
      currentPrice: currentPrice || 0,
      epsTTM: 0,
      marketCapCr: marketCapCrVal,
      peRatio: null,
    };
  }

  // Take the latest 4 quarters PAT
  const last4Quarters = financialResults
    .slice(0, 4)
    .map((q) => Number(q.proLossAftTax) || 0);

  // Sum of Net Profit (PAT) in Lakhs
  const totalPATLakhs = last4Quarters.reduce((sum, val) => sum + val, 0);

  // Convert Lakhs -> Crores
  const totalPATCrores = totalPATLakhs / 100;

  // Convert Issued Size -> Crores
  const sharesCrores = issuedSize / 1e7;

  // EPS TTM
  const epsTTM = totalPATCrores / sharesCrores;

  // Market Cap in Crores
  const marketCapCr = (issuedSize * currentPrice) / 1e7;

  // P/E ratio
  const peRatio = epsTTM > 0 ? currentPrice / epsTTM : null;

  return {
    currentPrice,
    epsTTM: Number(epsTTM.toFixed(2)),
    marketCapCr: Number(marketCapCr.toFixed(2)) + " Cr",
    peRatio: peRatio !== null ? Number(peRatio.toFixed(2)) : null,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (
      !symbol ||
      typeof symbol !== "string" ||
      !/^[A-Za-z0-9\-\.]+$/.test(symbol)
    ) {
      return NextResponse.json(
        {
          error:
            "Symbol parameter is required and must be a valid alphanumeric string",
        },
        { status: 400 }
      );
    }

    const cached = getCachedData(symbol);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true }, { status: 200 });
    }

    const data1 = await nseIndia.getEquityCorporateInfo(symbol);

    if (!data1?.financial_results?.data?.[0]?.xbrl_attachment) {
      return NextResponse.json(
        {
          error: "Invalid API response structure or no XBRL data available",
        },
        { status: 400 }
      );
    }

    const priceInfo = await nseIndia.getEquityDetails(symbol);
    const actualCurrentPrice = priceInfo?.priceInfo?.close || 0;
    const issuedSize = priceInfo?.securityInfo?.issuedSize || 0;

    const data = calculateMetrics(
      data1.financial_results.data,
      issuedSize,
      actualCurrentPrice
    );

    if (data) {
      setCachedData(symbol, data);
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

