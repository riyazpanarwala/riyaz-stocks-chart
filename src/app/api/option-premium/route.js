import { NextResponse } from "next/server";

const SHOONYA_API = "https://api.shoonya.com/NorenWClientAPI";

const INTERVALS = Object.freeze({
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "60m": 60,
  "1d": 60,
});

function formatShoonyaExpiryTag(expiry) {
  if (!expiry || typeof expiry !== "string") return null;
  const str = expiry.trim().toUpperCase();
  const dmyMatch = /^(\d{1,2})[-/ ]?([A-Z]{3})[-/ ]?(\d{2,4})$/.exec(str);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mmm = dmyMatch[2];
    const yy = dmyMatch[3].length === 4 ? dmyMatch[3].slice(2) : dmyMatch[3];
    return `${dd}${mmm}${yy}`;
  }
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthIdx = parseInt(mm, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dd}${months[monthIdx]}${yyyy.slice(2)}`;
    }
  }
  return null;
}

async function searchShoonya(uid, accessToken, stext, exch = "NFO") {
  const body = `jData=${JSON.stringify({ uid, exch, stext })}&jKey=${encodeURIComponent(accessToken)}`;
  const response = await fetch(`${SHOONYA_API}/SearchScrip`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await response.json();
  if (payload?.stat === "Ok" && Array.isArray(payload.values)) {
    return payload.values;
  }
  return [];
}

async function resolveContract(uid, accessToken, { symbol = "NIFTY", strike = 25200, optionType = "CE", expiry, contract, exch = "NFO" }) {
  let availableExpiries = [];

  // 1. If explicit contract symbol provided, search directly
  if (contract && typeof contract === "string") {
    const directResults = await searchShoonya(uid, accessToken, contract.trim(), exch);
    availableExpiries = Array.from(new Set(directResults.map((v) => v.exd).filter(Boolean)));
    const exact = directResults.find((v) => v.tsym?.toUpperCase() === contract.trim().toUpperCase());
    if (exact) return { contract: exact, availableExpiries };
    if (directResults.length > 0) return { contract: directResults[0], availableExpiries };
  }

  const cleanSymbol = (symbol || "NIFTY").trim().toUpperCase();
  const cleanStrike = Math.round(Number(strike) || 25200);
  const cleanType = (optionType || "CE").trim().toUpperCase() === "PE" ? "PE" : "CE";
  const expiryTag = formatShoonyaExpiryTag(expiry);
  const cleanExpiryStr = expiry ? expiry.trim().toUpperCase() : null;

  // 2. Search for "${symbol} ${strike} ${optionType}"
  const searchQuery = `${cleanSymbol} ${cleanStrike} ${cleanType}`;
  const values = await searchShoonya(uid, accessToken, searchQuery, exch);

  if (values.length > 0) {
    availableExpiries = Array.from(new Set(values.map((v) => v.exd).filter(Boolean)));

    if (cleanExpiryStr || expiryTag) {
      // Check exact exd match e.g. "19-NOV-2026"
      if (cleanExpiryStr) {
        const exactExd = values.find((v) => v.exd?.toUpperCase() === cleanExpiryStr);
        if (exactExd) return { contract: exactExd, availableExpiries };
      }
      // Exact tsym expiry match (e.g. 23NOV26)
      if (expiryTag) {
        const exactTsym = values.find((v) => v.tsym?.toUpperCase().includes(expiryTag));
        if (exactTsym) return { contract: exactTsym, availableExpiries };

        // Partial month/year match in case holiday shifted expiry by 1-2 days
        const monthYearTag = expiryTag.slice(2);
        const closeMatch = values.find((v) => v.tsym?.toUpperCase().includes(monthYearTag));
        if (closeMatch) return { contract: closeMatch, availableExpiries };
      }
    }
    // Default to the nearest expiry
    return { contract: values[0], availableExpiries };
  }

  // 3. Fallback search by symbol and strike
  const fallbackValues = await searchShoonya(uid, accessToken, `${cleanSymbol} ${cleanStrike}`, exch);
  const typeFilter = fallbackValues.filter((v) => v.optt === cleanType || v.tsym?.endsWith(cleanType));
  if (typeFilter.length > 0) {
    availableExpiries = Array.from(new Set(typeFilter.map((v) => v.exd).filter(Boolean)));
    if (cleanExpiryStr) {
      const exactExd = typeFilter.find((v) => v.exd?.toUpperCase() === cleanExpiryStr);
      if (exactExd) return { contract: exactExd, availableExpiries };
    }
    if (expiryTag) {
      const match = typeFilter.find((v) => v.tsym?.toUpperCase().includes(expiryTag));
      if (match) return { contract: match, availableExpiries };
    }
    return { contract: typeFilter[0], availableExpiries };
  }

  return { contract: null, availableExpiries: [] };
}

async function getTimePriceSeries({ uid, accessToken, token, intervalId, exch = "NFO" }) {
  const intrv = String(INTERVALS[intervalId] || 5);
  const endTime = Math.floor(Date.now() / 1000);
  // Window: 3 days for 1m, 7 days for 3m/5m, 30 days for 15m+
  const windowDays = intervalId === "1m" ? 3 : intervalId === "3m" || intervalId === "5m" ? 7 : 30;
  const startTime = endTime - windowDays * 24 * 60 * 60;

  const body = `jData=${JSON.stringify({
    uid,
    exch,
    token: String(token),
    st: String(startTime),
    et: String(endTime),
    intrv,
  })}&jKey=${encodeURIComponent(accessToken)}`;

  const response = await fetch(`${SHOONYA_API}/TPSeries`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(payload?.emsg || `Shoonya candle request failed (${response.status}).`);
  }
  return payload;
}

function toIsoDate(time) {
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(time ?? "");
  if (!match) return null;
  const [, day, month, year, clock] = match;
  const timestamp = new Date(`${year}-${month}-${day}T${clock}+05:30`);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

export async function GET(request) {
  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();
  if (!uid || !accessToken) {
    return NextResponse.json(
      { error: "Set SHOONYA_UID and SHOONYA_ACCESS_TOKEN in .env to load this chart." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawSymbol = searchParams.get("symbol") || "NIFTY";
  const cleanSymbol = rawSymbol.trim().toUpperCase();

  // Exchange detection: SENSEX and BANKEX trade on BSE (BFO)
  const exch = (cleanSymbol === "SENSEX" || cleanSymbol === "BANKEX" || searchParams.get("exch")?.toUpperCase() === "BFO")
    ? "BFO"
    : "NFO";

  // Appropriate strike defaults based on index
  let strike = searchParams.get("strike") ? Number(searchParams.get("strike")) : null;
  if (!strike) {
    if (cleanSymbol === "SENSEX") strike = 80000;
    else if (cleanSymbol === "BANKNIFTY") strike = 52000;
    else strike = 25200;
  } else if (cleanSymbol === "SENSEX" && strike < 30000) {
    strike = 80000;
  }

  const optionType = searchParams.get("optionType") || "CE";
  const expiry = searchParams.get("expiry") || null;
  const contractParam = searchParams.get("contract") || null;
  const intervalId = searchParams.get("interval") || "5m";

  if (!INTERVALS[intervalId]) {
    return NextResponse.json({ error: "Unsupported Shoonya chart interval." }, { status: 400 });
  }

  try {
    const { contract, availableExpiries } = await resolveContract(uid, accessToken, {
      symbol: cleanSymbol,
      strike,
      optionType,
      expiry,
      contract: contractParam,
      exch,
    });

    if (!contract?.token) {
      return NextResponse.json(
        { error: `Shoonya could not find an option contract for ${cleanSymbol} ${strike} ${optionType}${expiry ? ` (${expiry})` : ""} on ${exch}.` },
        { status: 404 },
      );
    }

    const series = await getTimePriceSeries({
      uid,
      accessToken,
      token: contract.token,
      intervalId,
      exch: contract.exch || exch,
    });

    const candles = series
      .filter((row) => row.stat == null || row.stat === "Ok")
      .map((row) => ({
        date: toIsoDate(row.time),
        open: Number(row.into),
        high: Number(row.inth),
        low: Number(row.intl),
        close: Number(row.intc),
        volume: Number(row.intv ?? row.v ?? 0),
        oi: Number(row.oi ?? 0),
      }))
      .filter((candle) => candle.date && Number.isFinite(candle.close) && candle.close > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(
      {
        contract: contract.tsym,
        token: contract.token,
        symbol: contract.symname || cleanSymbol,
        exch: contract.exch || exch,
        strike,
        optionType: contract.optt || optionType,
        expiry: contract.exd || expiry,
        availableExpiries: availableExpiries.length > 0 ? availableExpiries : [contract.exd].filter(Boolean),
        interval: intervalId,
        candles,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Shoonya option premium request failed:", error.message);
    if (/^No Data/i.test(error.message || "")) {
      return NextResponse.json(
        { error: `Shoonya returned No Data for this contract. It could not find candles for the requested period.` },
        { status: 404 },
      );
    }
    if (/Session Expired|Invalid Token|Susertoken/i.test(error.message || "")) {
      return NextResponse.json(
        { error: "Shoonya session or access token has expired. Please renew the token below." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: `Could not load option candles: ${error.message || "Your Shoonya access token may have expired or data is unavailable."}` },
      { status: 502 },
    );
  }
}
