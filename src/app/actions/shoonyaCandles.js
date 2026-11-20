"use server";

import fs from "node:fs";
import path from "node:path";
import { getUpstoxCandlesAction } from "./upstox.js";

const SHOONYA_API = "https://api.shoonya.com/NorenWClientAPI";

// Cached ISIN-to-Symbol mappings
let isinMap = null;
function getSymbolFromIsin(isin) {
  if (!isin || typeof isin !== "string" || !isin.startsWith("INE")) return null;
  if (!isinMap) {
    try {
      const filePath = path.join(process.cwd(), "data", "instruments.json");
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      isinMap = new Map();
      if (Array.isArray(parsed?.instruments)) {
        for (const inst of parsed.instruments) {
          if (inst.value && inst.symbol) {
            isinMap.set(inst.value, { symbol: inst.symbol, bseCode: inst.bseCode });
          }
        }
      }
    } catch (err) {
      console.warn("[shoonyaCandles] Could not load instruments.json for ISIN mapping:", err.message);
      isinMap = new Map();
    }
  }
  return isinMap.get(isin) || null;
}

// In-memory token lookup cache to eliminate redundant SearchScrip calls
const scripTokenCache = new Map();

const KNOWN_INDICES = Object.freeze({
  "NIFTY 50": { exch: "NSE", token: "26000", sym: "NSE:Nifty 50" },
  NIFTY: { exch: "NSE", token: "26000", sym: "NSE:Nifty 50" },
  "NIFTY BANK": { exch: "NSE", token: "26009", sym: "NSE:Nifty Bank" },
  BANKNIFTY: { exch: "NSE", token: "26009", sym: "NSE:Nifty Bank" },
  "NIFTY MIDCAP 100": { exch: "NSE", token: "26014", sym: "NSE:NIFTY MIDCAP 100" },
  "NIFTY SMLCAP 100": { exch: "NSE", token: "26015", sym: "NSE:NIFTY SMLCAP 100" },
  "NIFTY NEXT 50": { exch: "NSE", token: "26013", sym: "NSE:NIFTY NEXT 50" },
  "NIFTY FINANCIAL SERVICES": { exch: "NSE", token: "26037", sym: "NSE:Nifty Financial Services" },
  FINNIFTY: { exch: "NSE", token: "26037", sym: "NSE:Nifty Financial Services" },
  SENSEX: { exch: "BSE", token: "1", sym: "BSE:SENSEX" },
  BANKEX: { exch: "BSE", token: "12", sym: "BSE:BANKEX" },
});

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
    throw new Error(`Shoonya ${endpoint} HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Resolves symbol, exchange, token, and tsym for Shoonya.
 */
async function resolveShoonyaTarget(rawKey, uid, accessToken) {
  const [indexName = "", companyValue = ""] = String(rawKey || "").split("|");
  const upperVal = companyValue.trim().toUpperCase();
  const upperIdx = indexName.trim().toUpperCase();

  // 1. Check if known index
  if (KNOWN_INDICES[upperVal]) {
    return KNOWN_INDICES[upperVal];
  }

  // 2. Resolve Stock Symbol
  let symbol = upperVal;
  let bseCode = null;

  if (symbol.startsWith("INE")) {
    const isinInfo = getSymbolFromIsin(companyValue.trim());
    if (isinInfo?.symbol) {
      symbol = isinInfo.symbol.toUpperCase();
      bseCode = isinInfo.bseCode;
    }
  }

  const exch = upperIdx.startsWith("BSE") ? "BSE" : "NSE";
  const cacheKey = `${exch}|${symbol}`;
  if (scripTokenCache.has(cacheKey)) {
    return scripTokenCache.get(cacheKey);
  }

  // 3. SearchScrip on Shoonya
  try {
    const searchRes = await callShoonya("SearchScrip", { uid, exch, stext: symbol }, accessToken, 7000);
    if (searchRes?.stat === "Ok" && Array.isArray(searchRes.values) && searchRes.values.length > 0) {
      // Find equity match e.g. "RELIANCE-EQ" or bseCode
      const match =
        searchRes.values.find((v) => v.tsym === `${symbol}-EQ`) ||
        (bseCode ? searchRes.values.find((v) => v.token === String(bseCode)) : null) ||
        searchRes.values.find((v) => v.tsym?.startsWith(symbol)) ||
        searchRes.values[0];

      if (match?.token) {
        const resolved = {
          exch,
          token: String(match.token),
          tsym: match.tsym,
          sym: `${exch}:${match.tsym}`,
        };
        scripTokenCache.set(cacheKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    console.warn(`[shoonyaCandles] SearchScrip failed for ${symbol} on ${exch}:`, err.message);
  }

  // Fallback direct guess
  return {
    exch,
    token: null,
    tsym: `${symbol}-EQ`,
    sym: `${exch}:${symbol}-EQ`,
  };
}

function toIsoFromShoonyaTime(timeStr) {
  if (!timeStr) return null;
  // "20-11-2026 15:25:00"
  const match = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})$/.exec(timeStr);
  if (match) {
    const [, dd, mm, yyyy, clock] = match;
    return `${yyyy}-${mm}-${dd}T${clock}+05:30`;
  }
  // "19-NOV-2026"
  const dmyMatch = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(timeStr);
  if (dmyMatch) {
    const [, dd, mmm, yyyy] = dmyMatch;
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthNum = String(months.indexOf(mmm.toUpperCase()) + 1).padStart(2, "0");
    return `${yyyy}-${monthNum}-${dd.padStart(2, "0")}T00:00:00+05:30`;
  }
  return null;
}

/**
 * Server Action: getShoonyaCandlesAction
 * Serves candlestick chart data for the Home Page from Shoonya API.
 * Automatically falls back to getUpstoxCandlesAction if Shoonya is unconfigured or fails.
 */
export async function getShoonyaCandlesAction({
  type = "historical",
  instrumentKey,
  interval,
  apiInterval = 1,
  toDate,
  fromDate,
} = {}) {
  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();

  // If Shoonya credentials are not present, transparently fallback to Upstox
  if (!uid || !accessToken) {
    return getUpstoxCandlesAction({
      type,
      instrumentKey,
      interval,
      apiInterval,
      toDate,
      fromDate,
    });
  }

  try {
    const target = await resolveShoonyaTarget(instrumentKey, uid, accessToken);

    const isIntradayType =
      type === "intraday" ||
      interval === "minutes" ||
      interval === "hours" ||
      interval === "1minute" ||
      interval === "30minute";

    if (isIntradayType) {
      if (!target?.token) {
        throw new Error(`Shoonya instrument token could not be resolved for ${instrumentKey}`);
      }

      const intrv = interval === "hours" ? String(Number(apiInterval || 1) * 60) : String(apiInterval || 1);
      const endTime = Math.floor(Date.now() / 1000);
      const windowDays = intrv === "1" ? 3 : intrv === "3" || intrv === "5" ? 7 : 30;
      const startTime = endTime - windowDays * 24 * 60 * 60;

      const series = await callShoonya(
        "TPSeries",
        {
          uid,
          exch: target.exch,
          token: target.token,
          st: String(startTime),
          et: String(endTime),
          intrv,
        },
        accessToken,
        12000,
      );

      if (!Array.isArray(series) || series.length === 0) {
        throw new Error("Shoonya TPSeries returned no candles");
      }

      // Convert to Upstox-compatible candle arrays: [isoDate, open, high, low, close, volume, null, null]
      // Upstox provides candles in descending order (newest first)
      const candles = series
        .filter((row) => (row.stat == null || row.stat === "Ok") && row.time && row.intc != null)
        .map((row) => [
          toIsoFromShoonyaTime(row.time),
          parseFloat(row.into || row.intc),
          parseFloat(row.inth || row.intc),
          parseFloat(row.intl || row.intc),
          parseFloat(row.intc),
          parseInt(row.intv != null ? row.intv : row.v || 0, 10),
          null,
          null,
        ])
        .filter((c) => c[0] && Number.isFinite(c[4]));

      return {
        status: "success",
        source: "shoonya",
        data: { candles },
      };
    }

    // Historical Daily Data (EODChartData)
    const nowSec = Math.floor(Date.now() / 1000);
    let fromSec = fromDate ? Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) : nowSec - 365 * 24 * 3600;
    let toSec = toDate ? Math.floor(new Date(`${toDate}T23:59:59Z`).getTime() / 1000) : nowSec;

    if (Number.isNaN(fromSec)) fromSec = nowSec - 365 * 24 * 3600;
    if (Number.isNaN(toSec)) toSec = nowSec;

    const eodList = await callShoonya(
      "EODChartData",
      {
        uid,
        sym: target.sym,
        from: String(fromSec),
        to: String(toSec),
      },
      accessToken,
      12000,
    );

    if (!Array.isArray(eodList) || eodList.length === 0) {
      throw new Error(`Shoonya EODChartData returned no candles for ${target.sym}`);
    }

    const candles = eodList
      .map((entry) => {
        let row = entry;
        if (typeof entry === "string") {
          try {
            row = JSON.parse(entry);
          } catch {
            return null;
          }
        }
        if (!row?.time || row?.intc == null) return null;
        return [
          toIsoFromShoonyaTime(row.time),
          parseFloat(row.into || row.intc),
          parseFloat(row.inth || row.intc),
          parseFloat(row.intl || row.intc),
          parseFloat(row.intc),
          parseInt(row.intv || 0, 10),
          null,
          null,
        ];
      })
      .filter((c) => c && c[0] && Number.isFinite(c[4]));

    return {
      status: "success",
      source: "shoonya",
      data: { candles },
    };
  } catch (shoonyaError) {
    console.warn(`[getShoonyaCandlesAction] Shoonya failed for ${instrumentKey}, falling back to Upstox:`, shoonyaError.message);
    // Seamless fallback to Upstox
    return getUpstoxCandlesAction({
      type,
      instrumentKey,
      interval,
      apiInterval,
      toDate,
      fromDate,
    });
  }
}
