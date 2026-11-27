"use server";

import fs from "node:fs";
import path from "node:path";
import { getUpstoxCandlesAction } from "./upstox.js";
import { getFinanceDataAction } from "./finance.js";

const SHOONYA_API = "https://api.shoonya.com/NorenWClientAPI";

// Cached ISIN-to-Symbol mappings (supports INE... equities and INF... ETFs)
let isinMap = null;
function getInstrumentByValue(value) {
  if (!value || typeof value !== "string") return null;
  const clean = value.trim();

  if (!isinMap) {
    try {
      const filePath = path.join(process.cwd(), "data", "instruments.json");
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      isinMap = new Map();
      if (Array.isArray(parsed?.instruments)) {
        for (const inst of parsed.instruments) {
          if (inst.value && inst.symbol) {
            isinMap.set(inst.value.trim().toUpperCase(), {
              symbol: inst.symbol.toUpperCase(),
              bseCode: inst.bseCode,
              label: inst.label,
              etf: inst.etf,
            });
          }
        }
      }
    } catch (err) {
      console.warn("[shoonyaCandles] Could not load instruments.json for ISIN mapping:", err.message);
      isinMap = new Map();
    }
  }

  return isinMap.get(clean.toUpperCase()) || null;
}

// In-memory token lookup cache to eliminate redundant SearchScrip calls
const scripTokenCache = new Map();

const KNOWN_INDICES = Object.freeze({
  "NIFTY 50": { exch: "NSE", token: "26000", sym: "NSE:Nifty 50", upstoxKey: "NSE_INDEX|Nifty 50", yahooSymbol: "^NSEI" },
  NIFTY: { exch: "NSE", token: "26000", sym: "NSE:Nifty 50", upstoxKey: "NSE_INDEX|Nifty 50", yahooSymbol: "^NSEI" },
  "NIFTY BANK": { exch: "NSE", token: "26009", sym: "NSE:Nifty Bank", upstoxKey: "NSE_INDEX|Nifty Bank", yahooSymbol: "^NSEBANK" },
  BANKNIFTY: { exch: "NSE", token: "26009", sym: "NSE:Nifty Bank", upstoxKey: "NSE_INDEX|Nifty Bank", yahooSymbol: "^NSEBANK" },
  "NIFTY MIDCAP 100": { exch: "NSE", token: "26014", sym: "NSE:NIFTY MIDCAP 100", upstoxKey: "NSE_INDEX|NIFTY MIDCAP 100", yahooSymbol: "NIFTY_MIDCAP_100.NS" },
  "NIFTY SMLCAP 100": { exch: "NSE", token: "26015", sym: "NSE:NIFTY SMLCAP 100", upstoxKey: "NSE_INDEX|NIFTY SMLCAP 100", yahooSymbol: "NIFTY_SMALLCAP_100.NS" },
  "NIFTY NEXT 50": { exch: "NSE", token: "26013", sym: "NSE:NIFTY NEXT 50", upstoxKey: "NSE_INDEX|Nifty Next 50", yahooSymbol: "NIFTY_NEXT_50.NS" },
  "NIFTY FINANCIAL SERVICES": { exch: "NSE", token: "26037", sym: "NSE:Nifty Financial Services", upstoxKey: "NSE_INDEX|Nifty Fin Service", yahooSymbol: "NIFTY_FIN_SERVICE.NS" },
  FINNIFTY: { exch: "NSE", token: "26037", sym: "NSE:Nifty Financial Services", upstoxKey: "NSE_INDEX|Nifty Fin Service", yahooSymbol: "NIFTY_FIN_SERVICE.NS" },
  "NIFTY ENERGY": { exch: "NSE", token: "26018", sym: "NSE:Nifty Energy", upstoxKey: "NSE_INDEX|Nifty Energy", yahooSymbol: "^CNXENERGY" },
  "INDIA VIX": { exch: "NSE", token: "26017", sym: "NSE:India VIX", upstoxKey: "NSE_INDEX|India VIX", yahooSymbol: "^INDIAVIX" },
  SENSEX: { exch: "BSE", token: "1", sym: "BSE:SENSEX", upstoxKey: "BSE_INDEX|SENSEX", yahooSymbol: "^BSESN" },
  BANKEX: { exch: "BSE", token: "12", sym: "BSE:BANKEX", upstoxKey: "BSE_INDEX|BANKEX", yahooSymbol: "^BSEBANK" },
});

function resolveUpstoxInstrumentKey(instrumentKey) {
  const [, companyValue = ""] = String(instrumentKey || "").split("|");
  const upperVal = companyValue.trim().toUpperCase();
  return KNOWN_INDICES[upperVal]?.upstoxKey || instrumentKey;
}

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

  // 2. Resolve Stock / ETF Symbol from ISIN (INE... or INF...)
  let symbol = upperVal;
  let bseCode = null;
  let yahooSymbol = null;

  const instInfo = getInstrumentByValue(companyValue);
  if (instInfo?.symbol) {
    symbol = instInfo.symbol;
    bseCode = instInfo.bseCode;
  }

  const exch = upperIdx.startsWith("MCX") ? "MCX" : upperIdx.startsWith("BSE") ? "BSE" : "NSE";
  yahooSymbol = exch === "MCX" ? null : exch === "BSE" ? `${bseCode || symbol}.BO` : `${symbol}.NS`;

  const cacheKey = `${exch}|${symbol}`;
  if (scripTokenCache.has(cacheKey)) {
    return { ...scripTokenCache.get(cacheKey), yahooSymbol };
  }

  // 3. SearchScrip on Shoonya
  try {
    const stext = exch === "MCX" ? `${symbol} FUT` : symbol;
    const searchRes = await callShoonya("SearchScrip", { uid, exch, stext }, accessToken, 7000);
    if (searchRes?.stat === "Ok" && Array.isArray(searchRes.values) && searchRes.values.length > 0) {
      let match = null;
      if (exch === "MCX") {
        const futMatches = searchRes.values
          .filter((v) => v.instname === "FUTCOM" && v.symname?.toUpperCase() === symbol && v.token)
          .sort((a, b) => Date.parse(a.exd || "") - Date.parse(b.exd || ""));
        match = futMatches[0] || searchRes.values.find((v) => v.symname?.toUpperCase() === symbol) || searchRes.values[0];
      } else {
        match =
          searchRes.values.find((v) => v.tsym === `${symbol}-EQ`) ||
          (bseCode ? searchRes.values.find((v) => v.token === String(bseCode)) : null) ||
          searchRes.values.find((v) => v.tsym?.startsWith(symbol)) ||
          searchRes.values[0];
      }

      if (match?.token) {
        const resolved = {
          exch,
          token: String(match.token),
          tsym: match.tsym,
          sym: `${exch}:${match.tsym}`,
          yahooSymbol,
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
    yahooSymbol,
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
 * Fallback to Yahoo Finance when Shoonya and Upstox both have incomplete or missing data.
 */
async function fallbackToYahooFinance(yahooSymbol, { interval, fromDate, toDate } = {}) {
  if (!yahooSymbol) return null;

  try {
    const yfInterval = interval === "days" ? "1d" : interval === "weeks" ? "1wk" : interval === "months" ? "1mo" : "1d";
    const isIntraday =
      interval === "minutes" ||
      interval === "hours" ||
      interval === "1minute" ||
      interval === "30minute";
    const resolvedFromDate =
      fromDate ||
      new Date(Date.now() - (isIntraday ? 5 : 365) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rawData = await getFinanceDataAction({
      symbol: yahooSymbol,
      interval: yfInterval,
      fromDate: resolvedFromDate,
      toDate,
    });

    if (Array.isArray(rawData) && rawData.length > 0) {
      // Convert to Upstox/Shoonya compatible format (descending order, newest first)
      const candles = rawData
        .filter((q) => q && q.date && Number.isFinite(q.close))
        .map((q) => {
          const d = new Date(q.date);
          const iso = !Number.isNaN(d.getTime())
            ? d.toISOString().slice(0, 10) + "T00:00:00+05:30"
            : String(q.date);
          return [
            iso,
            Number(q.open),
            Number(q.high),
            Number(q.low),
            Number(q.close),
            Number(q.volume || 0),
            q.dividends ?? (q.dividend ? [q.dividend] : null),
            q.splits ?? (q.split ? [q.split] : null),
          ];
        })
        .reverse();

      return {
        status: "success",
        source: "yahoo",
        data: { candles },
      };
    }
  } catch (err) {
    console.warn(`[shoonyaCandles] Yahoo fallback failed for ${yahooSymbol}:`, err.message);
  }

  return null;
}

/**
 * Multi-Tier Fallback: Upstox ➔ Yahoo Finance
 */
async function executeFallback({
  type,
  instrumentKey,
  interval,
  apiInterval,
  toDate,
  fromDate,
  yahooSymbol,
}) {
  // 1. Try Upstox
  try {
    const upstoxKey = resolveUpstoxInstrumentKey(instrumentKey);
    const upstoxRes = await getUpstoxCandlesAction({
      type,
      instrumentKey: upstoxKey,
      interval,
      apiInterval,
      toDate,
      fromDate,
    });

    if (upstoxRes?.data?.candles && upstoxRes.data.candles.length > 0) {
      return {
        status: "success",
        source: "upstox",
        data: upstoxRes.data,
      };
    }
  } catch (err) {
    console.warn(`[shoonyaCandles] Upstox fallback failed:`, err.message);
  }

  // 2. Try Yahoo Finance
  const yahooRes = await fallbackToYahooFinance(yahooSymbol, { interval, fromDate, toDate });
  if (yahooRes?.data?.candles && yahooRes.data.candles.length > 0) {
    return yahooRes;
  }

  return {
    error: true,
    message: "No candle data available from Shoonya, Upstox, or Yahoo Finance.",
    data: { candles: [] },
  };
}

/**
 * Server Action: getShoonyaCandlesAction
 * Serves candlestick chart data for the Home Page from Shoonya API.
 * Performs data density validation and falls back seamlessly to Upstox / Yahoo Finance.
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

  // If Shoonya credentials are not present, trigger fallback
  if (!uid || !accessToken) {
    const [indexName = "", companyValue = ""] = String(instrumentKey || "").split("|");
    const upperVal = companyValue.trim().toUpperCase();
    const yahooSymbol = KNOWN_INDICES[upperVal]?.yahooSymbol || (indexName.startsWith("BSE") ? `${upperVal}.BO` : `${upperVal}.NS`);
    return executeFallback({ type, instrumentKey, interval, apiInterval, toDate, fromDate, yahooSymbol });
  }

  let resolvedTarget = null;
  try {
    resolvedTarget = await resolveShoonyaTarget(instrumentKey, uid, accessToken);

    const isIntradayType =
      type === "intraday" ||
      interval === "minutes" ||
      interval === "hours" ||
      interval === "1minute" ||
      interval === "30minute";

    // ── 1. Intraday Mode via Shoonya TPSeries ─────────────────
    if (isIntradayType) {
      if (!resolvedTarget?.token) {
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
          exch: resolvedTarget.exch,
          token: resolvedTarget.token,
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

      // Convert to Upstox-compatible candle arrays (descending order, newest first)
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

      if (candles.length === 0) {
        throw new Error("No valid intraday candles parsed from Shoonya TPSeries");
      }

      return {
        status: "success",
        source: "shoonya",
        data: { candles },
      };
    }

    // ── 2. Historical Daily Mode via Shoonya EODChartData ─────
    const nowSec = Math.floor(Date.now() / 1000);
    let fromSec = fromDate ? Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) : nowSec - 365 * 24 * 3600;
    let toSec = toDate ? Math.floor(new Date(`${toDate}T23:59:59Z`).getTime() / 1000) : nowSec;

    if (Number.isNaN(fromSec)) fromSec = nowSec - 365 * 24 * 3600;
    if (Number.isNaN(toSec)) toSec = nowSec;

    const requestedSpanDays = Math.max(1, (toSec - fromSec) / (24 * 3600));

    const eodList = await callShoonya(
      "EODChartData",
      {
        uid,
        sym: resolvedTarget.sym,
        from: String(fromSec),
        to: String(toSec),
      },
      accessToken,
      12000,
    );

    if (!Array.isArray(eodList) || eodList.length === 0) {
      throw new Error(`Shoonya EODChartData returned no candles for ${resolvedTarget.sym}`);
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

    // ── DATA DENSITY VALIDATION ──────────────────────────────
    // If user requested >60 days of history but Shoonya returned <20 candles (e.g. SENSEX 5 candles),
    // or if user requested >200 days (>6 months / 1 year) but Shoonya returned <60 candles:
    // Shoonya's historical coverage for this symbol is incomplete. Automatically trigger fallback!
    if ((requestedSpanDays > 60 && candles.length < 20) || (requestedSpanDays > 200 && candles.length < 60)) {
      throw new Error(
        `Shoonya historical depth incomplete (${candles.length} candles returned for span of ${Math.round(requestedSpanDays)} days). Triggering fallback.`,
      );
    }

    return {
      status: "success",
      source: "shoonya",
      data: { candles },
    };
  } catch (shoonyaError) {
    console.warn(
      `[getShoonyaCandlesAction] Shoonya fallback for ${instrumentKey}:`,
      shoonyaError.message,
    );

    return executeFallback({
      type,
      instrumentKey,
      interval,
      apiInterval,
      toDate,
      fromDate,
      yahooSymbol: resolvedTarget?.yahooSymbol,
    });
  }
}

/**
 * Resolves the Shoonya WebSocket subscription key (e.g. "NSE|26000") for an instrumentKey.
 */
export async function getShoonyaStreamKeyAction(instrumentKey) {
  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();
  if (!uid || !accessToken || !instrumentKey) {
    return { tokenKey: null };
  }

  try {
    const target = await resolveShoonyaTarget(instrumentKey, uid, accessToken);
    if (target?.exch && target?.token) {
      return { tokenKey: `${target.exch}|${target.token}` };
    }
  } catch (err) {
    console.warn(`[getShoonyaStreamKeyAction] Failed for ${instrumentKey}:`, err.message);
  }

  return { tokenKey: null };
}
