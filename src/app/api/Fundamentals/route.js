import { NextResponse } from "next/server";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { NseIndia } from "stock-nse-india";
const nseIndia = new NseIndia();

const financialDataCache = new Map();

export function getCachedData(symbol) {
  const entry = financialDataCache.get(symbol);
  if (!entry) return null;

  const now = Date.now();
  const { data, timestamp, ttl } = entry;

  if (now - timestamp < ttl) {
    return data;
  } else {
    financialDataCache.delete(symbol);
    return null;
  }
}

export function setCachedData(symbol, data, ttl = 1000 * 60 * 15) {
  financialDataCache.set(symbol, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

function getValue(field, contextRef = null) {
  if (!field) return "Not Found";
  if (Array.isArray(field)) {
    if (contextRef) {
      const match = field.find((f) => f["@_contextRef"] === contextRef);
      return match?.["#text"] || "Not Found";
    }
    return field[0]?.["#text"] || "Not Found";
  }
  if (contextRef && field["@_contextRef"] !== contextRef) return "Not Found";
  return field["#text"] || "Not Found";
}

async function extractFinancialsFromUrl(
  xmlUrl,
  currentPrice,
  contextRef = null
) {
  const allowedDomains = [
    "nseindia.com",
    "www.nseindia.com",
    "nsearchives.nseindia.com",
  ];
  const url = new URL(xmlUrl);
  if (!allowedDomains.includes(url.hostname)) {
    console.error("Invalid URL domain");
    return { error: "Invalid URL domain" };
  }

  try {
    const response = await axios.get(xmlUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/119.0 Safari/537.36",
        Referer: "https://www.nseindia.com/",
        Accept:
          "application/xml,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      responseType: "text",
      timeout: 8000,
    });

    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(response.data);
    const xbrl = result["xbrli:xbrl"];

    const basicEPS = getValue(
      xbrl[
        "in-capmkt:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations"
      ],
      contextRef
    );
    const dilutedEPS = getValue(
      xbrl[
        "in-capmkt:DilutedEarningsLossPerShareFromContinuingAndDiscontinuedOperations"
      ],
      contextRef
    );
    const earningPerShare = getValue(
      xbrl["in-capmkt:EarningPerShare"],
      contextRef
    );
    const netProfit = getValue(xbrl["in-capmkt:NetProfitAfterTax"], contextRef);
    const netWorth = getValue(xbrl["in-capmkt:NetWorth"], contextRef);
    const equity = getValue(xbrl["in-capmkt:EquityShareCapital"], contextRef);
    const otherEquity = getValue(xbrl["in-capmkt:OtherEquity"], contextRef);
    const faceValue = getValue(
      xbrl["in-capmkt:FaceValueOfEquityShareCapital"],
      contextRef
    );

    const profitBeforeTax = getValue(
      xbrl["in-capmkt:ProfitBeforeTax"],
      contextRef
    );
    const financeCosts = getValue(xbrl["in-capmkt:FinanceCosts"], contextRef);
    const totalAssets = getValue(xbrl["in-capmkt:Assets"], contextRef);
    const currentLiabilities = getValue(
      xbrl["in-capmkt:CurrentLiabilities"],
      contextRef
    );

    const safe = (val) => (val && !isNaN(val) ? parseFloat(val) : 0);

    const totalEquity = safe(equity) + safe(otherEquity);
    const numShares = safe(equity) / safe(faceValue);
    const bookValuePerShare = numShares
      ? (totalEquity / numShares).toFixed(2)
      : "Not Found";
    const combinedEPS = (
      safe(basicEPS) +
      safe(dilutedEPS) +
      safe(earningPerShare)
    ).toFixed(2);

    const roe =
      safe(netProfit) && safe(netWorth) && safe(netWorth) !== 0
        ? ((safe(netProfit) / safe(netWorth)) * 100).toFixed(2) + "%"
        : "Not Found";

    const marketCap =
      safe(equity) && safe(faceValue) && currentPrice
        ? ((safe(equity) / safe(faceValue)) * currentPrice).toFixed(2)
        : "Not Found";

    const EBIT = safe(profitBeforeTax) + safe(financeCosts);
    const capitalEmployed = safe(totalAssets) - safe(currentLiabilities);

    const roce =
      EBIT && capitalEmployed && capitalEmployed !== 0
        ? ((EBIT / capitalEmployed) * 100).toFixed(2) + "%"
        : "Not Found";

    return {
      basicEPS,
      dilutedEPS,
      earningPerShare,
      combinedEPS,
      netProfit,
      netWorth,
      equity,
      otherEquity,
      faceValue,
      bookValuePerShare,
      roe,
      marketCap,
      roce,
      PE:
        currentPrice && safe(combinedEPS) && safe(combinedEPS) !== 0
          ? (currentPrice / safe(combinedEPS)).toFixed(2)
          : "Not Found",
      PB:
        currentPrice && safe(bookValuePerShare) && safe(bookValuePerShare) !== 0
          ? (currentPrice / safe(bookValuePerShare)).toFixed(2)
          : "Not Found",
      currentPrice,
    };
  } catch (err) {
    console.error("❌ Failed to parse XML:", err.message);
    return { error: "Failed to parse XML: " + err.message };
  }
}

function calculateMetrics(financialResults, issuedSize, currentPrice) {
  if (!Array.isArray(financialResults) || financialResults.length < 4) {
    return { epsTTM: 0, marketCap: 0, peRatio: null };
  }

  // Take the latest 4 quarters PAT
  const last4Quarters = financialResults
    .slice(0, 4) // assumes API gives latest first, else sort by to_date
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
    marketCapCr: Number(marketCapCr.toFixed(2)) + " Cr", // in Crores
    peRatio: peRatio !== null ? Number(peRatio.toFixed(2)) : null,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    /*
    const price = searchParams.get("price");

    if (!price) {
      return NextResponse.json(
        { error: "Price parameter is required for accurate calculations" },
        { status: 400 }
      );
    }
    */

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
    const issuedSize = priceInfo?.securityInfo.issuedSize;

    const data = calculateMetrics(
      data1.financial_results.data,
      issuedSize,
      actualCurrentPrice
    );

    // const url = data1.financial_results.data[0].xbrl_attachment;
    // const data = await extractFinancialsFromUrl(url, price);
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
