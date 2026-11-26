import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SHOONYA_API = "https://api.shoonya.com/NorenWClientAPI";

const INDEX_SPOT_TOKENS = Object.freeze({
  NIFTY: { exch: "NSE", token: "26000", step: 50 },
  BANKNIFTY: { exch: "NSE", token: "26009", step: 100 },
  FINNIFTY: { exch: "NSE", token: "26037", step: 50 },
  MIDCPNIFTY: { exch: "NSE", token: "26074", step: 25 },
  NIFTYNXT50: { exch: "NSE", token: "26013", step: 50 },
  SENSEX: { exch: "BSE", token: "1", step: 100 },
  BANKEX: { exch: "BSE", token: "12", step: 100 },
});

const MCX_COMMODITIES = new Set([
  "CRUDEOIL",
  "CRUDEOILM",
  "NATURALGAS",
  "GOLD",
  "GOLDM",
  "SILVER",
  "SILVERM",
  "SILVERMIC",
  "COPPER",
  "ZINC",
  "ALUMINIUM",
  "LEAD",
  "NICKEL",
]);

async function callShoonya(endpoint, payload, accessToken, timeoutMs = 15000) {
  const body = `jData=${JSON.stringify(payload)}&jKey=${encodeURIComponent(accessToken)}`;
  const response = await fetch(`${SHOONYA_API}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Shoonya ${endpoint} HTTP error ${response.status}`);
  }
  return response.json();
}

function parseShoonyaExpiry(exdStr) {
  if (!exdStr || typeof exdStr !== "string") return Number.POSITIVE_INFINITY;
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(exdStr.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const MONTHS = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const month = MONTHS[match[2].toUpperCase()];
  if (month === undefined) return Number.POSITIVE_INFINITY;
  return Date.UTC(Number(match[3]), month, Number(match[1]));
}

function getStrikeStep(symbol, spot) {
  const idx = INDEX_SPOT_TOKENS[symbol];
  if (idx?.step) return idx.step;
  if (spot > 50000) return 100;
  if (spot > 10000) return 50;
  if (spot > 2000) return 20;
  if (spot > 500) return 10;
  if (spot > 100) return 5;
  return 2.5;
}

export async function GET(request) {
  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();

  // If Shoonya credentials are not present, trigger immediate client fallback to NSE
  if (!uid || !accessToken) {
    return NextResponse.json(
      { ok: false, fallback: true, error: "Shoonya credentials not configured in .env." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawSymbol = searchParams.get("symbol") || "NIFTY";
  const cleanSymbol = rawSymbol.trim().toUpperCase();
  const requestedExpiry = searchParams.get("expiry")?.trim() || null;
  const cnt = Math.min(Math.max(parseInt(searchParams.get("cnt") || "15", 10), 5), 25);

  let exch = "NFO";
  if (cleanSymbol === "SENSEX" || cleanSymbol === "BANKEX" || searchParams.get("exch")?.toUpperCase() === "BFO") {
    exch = "BFO";
  } else if (MCX_COMMODITIES.has(cleanSymbol) || searchParams.get("exch")?.toUpperCase() === "MCX") {
    exch = "MCX";
  }

  try {
    // 1. Fetch Spot price if available
    let underlyingValue = 0;
    let spotKey = null;

    const indexInfo = INDEX_SPOT_TOKENS[cleanSymbol];
    if (indexInfo) {
      spotKey = `${indexInfo.exch}|${indexInfo.token}`;
      try {
        const spotQuote = await callShoonya("GetQuotes", {
          uid,
          exch: indexInfo.exch,
          token: indexInfo.token,
        }, accessToken, 6000);
        if (spotQuote?.lp) underlyingValue = parseFloat(spotQuote.lp);
      } catch (err) {
        console.warn(`[shoonya-chain] Could not fetch spot quote for ${cleanSymbol}:`, err.message);
      }
    }

    // 2. Discover active option contracts and expiries via SearchScrip
    let searchStep = getStrikeStep(cleanSymbol, underlyingValue || 25000);
    let approxCenter = underlyingValue > 0 ? Math.round(underlyingValue / searchStep) * searchStep : null;

    let searchResults = [];
    if (approxCenter) {
      try {
        const res = await callShoonya("SearchScrip", {
          uid,
          exch,
          stext: `${cleanSymbol} ${approxCenter}`,
        }, accessToken, 8000);
        if (res?.stat === "Ok" && Array.isArray(res.values)) {
          searchResults = res.values;
        }
      } catch (err) {
        console.warn(`[shoonya-chain] SearchScrip with strike failed:`, err.message);
      }
    }

    // Fallback search without strike if needed
    if (searchResults.length === 0) {
      const fallbackSearch = await callShoonya("SearchScrip", {
        uid,
        exch,
        stext: `${cleanSymbol} CE`,
      }, accessToken, 8000);
      if (fallbackSearch?.stat === "Ok" && Array.isArray(fallbackSearch.values)) {
        searchResults = fallbackSearch.values;
      }
    }

    if (searchResults.length === 0) {
      return NextResponse.json(
        { ok: false, fallback: true, error: `No active option contracts found on Shoonya for ${cleanSymbol} (${exch}).` },
        { status: 200 },
      );
    }

    // Filter to exact symbol match to avoid NIFTY matching NIFTYFPI
    const symbolMatches = searchResults.filter((v) => {
      const sym = v.symname?.toUpperCase();
      const tsym = v.tsym?.toUpperCase();
      return sym === cleanSymbol || (tsym && tsym.startsWith(cleanSymbol) && /^\d/.test(tsym.slice(cleanSymbol.length)));
    });

    const activeList = symbolMatches.length > 0 ? symbolMatches : searchResults;

    // Extract sorted unique expiries
    const availableExpiries = Array.from(new Set(activeList.map((v) => v.exd).filter(Boolean)))
      .sort((a, b) => parseShoonyaExpiry(a) - parseShoonyaExpiry(b));

    if (availableExpiries.length === 0) {
      return NextResponse.json(
        { ok: false, fallback: true, error: `No expiry dates found on Shoonya for ${cleanSymbol}.` },
        { status: 200 },
      );
    }

    // Determine target expiry
    let targetExpiry = availableExpiries[0];
    if (requestedExpiry) {
      const matched = availableExpiries.find(
        (e) => e.toUpperCase() === requestedExpiry.toUpperCase() || parseShoonyaExpiry(e) === parseShoonyaExpiry(requestedExpiry),
      );
      if (matched) targetExpiry = matched;
    }

    // Representative contract for the target expiry
    const repContract = activeList.find((v) => v.exd === targetExpiry) || activeList[0];

    // If underlyingValue was not found from index token, read sptprc from quote
    if (underlyingValue <= 0 && repContract?.token) {
      try {
        const q = await callShoonya("GetQuotes", { uid, exch, token: String(repContract.token) }, accessToken, 6000);
        if (q?.sptprc) underlyingValue = parseFloat(q.sptprc);
        else if (q?.lp) underlyingValue = parseFloat(q.lp);
      } catch {
        // ignore
      }
    }

    const step = getStrikeStep(cleanSymbol, underlyingValue || 25000);
    const centerStrike = underlyingValue > 0
      ? Math.round(underlyingValue / step) * step
      : (repContract?.strprc ? parseFloat(repContract.strprc) : 25000);

    // 3. Fetch Option Chain via GetOptionChain
    const chainRes = await callShoonya("GetOptionChain", {
      uid,
      exch,
      tsym: repContract.tsym,
      strprc: String(centerStrike),
      cnt: String(cnt),
    }, accessToken, 10000);

    if (chainRes?.stat !== "Ok" || !Array.isArray(chainRes.values) || chainRes.values.length === 0) {
      return NextResponse.json(
        { ok: false, fallback: true, error: chainRes?.emsg || "Shoonya GetOptionChain returned no contracts." },
        { status: 200 },
      );
    }

    // 4. Organize strikes and contracts
    /** @type {Record<number, { strikePrice: number, CE: object, PE: object }>} */
    const strikeMap = {};
    const tokenMap = {};
    const tokenKeys = [];

    if (spotKey) {
      tokenKeys.push(spotKey);
    }

    for (const c of chainRes.values) {
      const sp = parseFloat(c.strprc);
      if (!Number.isFinite(sp) || sp <= 0) continue;

      const optt = c.optt === "PE" ? "PE" : "CE";
      if (!strikeMap[sp]) {
        strikeMap[sp] = {
          strikePrice: sp,
          CE: { available: false, openInterest: 0, changeinOpenInterest: 0, totalTradedVolume: 0, lastPrice: 0, change: 0, impliedVolatility: 0, bidprice: 0, askPrice: 0, token: null, tradingSymbol: null },
          PE: { available: false, openInterest: 0, changeinOpenInterest: 0, totalTradedVolume: 0, lastPrice: 0, change: 0, impliedVolatility: 0, bidprice: 0, askPrice: 0, token: null, tradingSymbol: null },
        };
      }

      const tok = String(c.token);
      strikeMap[sp][optt] = {
        available: true,
        expiryDate: targetExpiry,
        openInterest: 0,
        changeinOpenInterest: 0,
        totalTradedVolume: 0,
        lastPrice: 0,
        change: 0,
        impliedVolatility: 0,
        bidprice: 0,
        askPrice: 0,
        token: tok,
        tradingSymbol: c.tsym,
      };

      tokenMap[tok] = { strikePrice: sp, optt, exch };
      tokenKeys.push(`${exch}|${tok}`);
    }

    const sortedStrikes = Object.keys(strikeMap).map(Number).sort((a, b) => a - b);

    // 5. Fetch initial baseline quotes for ATM strikes (ATM ± 8 strikes) so UI and signal engine are populated across intraday moves
    const atmIndex = sortedStrikes.reduce(
      (best, sp, idx) => Math.abs(sp - underlyingValue) < Math.abs(sortedStrikes[best] - underlyingValue) ? idx : best,
      0,
    );
    const initialAtmStrikes = sortedStrikes.slice(Math.max(0, atmIndex - 8), atmIndex + 9);

    const initialQuotePromises = [];
    for (const sp of initialAtmStrikes) {
      const row = strikeMap[sp];
      if (row.CE.token) {
        initialQuotePromises.push(
          callShoonya("GetQuotes", { uid, exch, token: row.CE.token }, accessToken, 4000)
            .then((q) => ({ sp, optt: "CE", q }))
            .catch(() => null),
        );
      }
      if (row.PE.token) {
        initialQuotePromises.push(
          callShoonya("GetQuotes", { uid, exch, token: row.PE.token }, accessToken, 4000)
            .then((q) => ({ sp, optt: "PE", q }))
            .catch(() => null),
        );
      }
    }

    const quoteResults = await Promise.allSettled(initialQuotePromises);
    for (const res of quoteResults) {
      if (res.status === "fulfilled" && res.value?.q?.stat === "Ok") {
        const { sp, optt, q } = res.value;
        const leg = strikeMap[sp]?.[optt];
        if (leg) {
          const lp = parseFloat(q.lp || 0);
          const close = parseFloat(q.c || lp);
          leg.lastPrice = lp;
          leg.change = lp && close ? lp - close : 0;
          leg.openInterest = parseInt(q.oi || 0, 10);
          leg.totalTradedVolume = parseInt(q.v || 0, 10);
          leg.bidprice = parseFloat(q.bp1 || 0);
          leg.askPrice = parseFloat(q.sp1 || 0);
          if (q.sptprc && !underlyingValue) {
            underlyingValue = parseFloat(q.sptprc);
          }
        }
      }
    }

    const rows = sortedStrikes.map((sp) => strikeMap[sp]);
    const fullOI = rows.map((r) => ({
      s: r.strikePrice,
      c: r.CE.openInterest || 0,
      cVol: r.CE.totalTradedVolume || 0,
      p: r.PE.openInterest || 0,
      pVol: r.PE.totalTradedVolume || 0,
    }));

    return NextResponse.json(
      {
        ok: true,
        source: "shoonya",
        timestamp: new Date().toISOString(),
        expiry: targetExpiry,
        expiries: availableExpiries,
        underlyingValue,
        displayData: rows,
        fullData: rows,
        fullOI,
        tokenMap,
        tokenKeys,
        spotKey,
        exchange: exch,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[shoonya-chain] Request failed, signalling fallback:", error.message);
    return NextResponse.json(
      { ok: false, fallback: true, error: error.message || "Failed to load option chain from Shoonya." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
