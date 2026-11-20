// ═══════════════════════════════════════════════════════════════
// OPTION CHAIN DATA FETCHER (SHOONYA PRIMARY + NSE FALLBACK)
// Prioritizes Shoonya API with real-time WebSocket readiness.
// Gracefully falls back to NSE API if Shoonya is unavailable.
// ═══════════════════════════════════════════════════════════════
import { numeric } from "../utils/analysis.js";
import { getNSEData } from "../../getIntervalData.js";
import { isolateExpiry } from "../utils/tradeRules.js";

/**
 * @typedef {{ type:"index"|"stock"|"commodity", symbol:string, lot:number, name:string }} Instrument
 */

/**
 * Fetches option chain from Shoonya API route.
 * Returns null if Shoonya is unconfigured, returned fallback flag, or failed.
 */
async function fetchShoonyaOptionChain(instrument, selectedExpiry) {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL("/api/shoonya-chain", window.location.origin);
    url.searchParams.set("symbol", instrument.symbol);
    url.searchParams.set("type", instrument.type || "index");
    if (selectedExpiry) {
      url.searchParams.set("expiry", selectedExpiry);
    }

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return null;
    const json = await res.json();

    if (json?.ok && json.source === "shoonya" && Array.isArray(json.displayData) && json.displayData.length > 0) {
      return json;
    }
    return null;
  } catch (err) {
    console.warn(`[fetchOptionChain] Shoonya attempt failed for ${instrument.symbol}, falling back to NSE:`, err.message);
    return null;
  }
}

/**
 * Fetch and normalise option-chain data for any instrument.
 * Attempts Shoonya API first; if unavailable, falls back to NSE.
 *
 * For indices : returns { source, timestamp, underlyingValue, displayData, fullOI, fullData, expiry, expiries, ... }
 * For stocks  : returns { source, timestamp, underlyingValue, data[] }
 *
 * @param {Instrument} instrument
 * @param {string|null} [selectedExpiry]
 * @returns {Promise<object>}
 */
export async function fetchOptionChain(instrument, selectedExpiry = null) {
  // ── 1. Attempt Primary: Shoonya API ───────────────────────
  const shoonyaData = await fetchShoonyaOptionChain(instrument, selectedExpiry);
  if (shoonyaData) {
    return shoonyaData;
  }

  // ── 2. Fallback: Existing NSE API ──────────────────────────
  const isIndex = instrument.type === "index";
  const apiName = isIndex ? "F&O" : "optionChain";

  const json = await getNSEData(apiName, instrument.symbol);

  if (!json || json.error) {
    throw new Error(
      json?.message ?? `Failed to fetch option chain data for ${instrument.symbol} from both Shoonya and NSE`,
    );
  }

  if (isIndex) {
    const rec = json.records ?? json;
    const chain = isolateExpiry(rec.data ?? []);
    const allRows = chain.rows
      .filter((r) => r.CE || r.PE)
      .sort((a, b) => a.strikePrice - b.strikePrice);

    const uv = numeric(rec.underlyingValue) ?? 0;
    const atmIdx = allRows.reduce(
      (bi, r, i) =>
        Math.abs(r.strikePrice - uv) < Math.abs(allRows[bi].strikePrice - uv)
          ? i
          : bi,
      0,
    );
    const displayData = allRows.slice(Math.max(0, atmIdx - 15), atmIdx + 16);
    const fullOI = allRows.map((r) => ({
      s: r.strikePrice,
      c: r.CE ? numeric(r.CE.openInterest) : 0,
      cVol: r.CE ? numeric(r.CE.totalTradedVolume) : 0,
      p: r.PE ? numeric(r.PE.openInterest) : 0,
      pVol: r.PE ? numeric(r.PE.totalTradedVolume) : 0,
    }));

    return {
      source: "nse",
      timestamp: rec.timestamp ?? null,
      expiry: chain.expiry,
      expiries: chain.expiries,
      underlyingValue: uv,
      displayData,
      fullData: allRows,
      fullOI,
    };
  }

  // Stock fallback
  const rows = json.data ?? [];
  const underlyingValue = rows.reduce((found, r) => {
    if (found > 0) return found;
    const uv = numeric(r.underlyingValue) ?? 0;
    return uv > 0 ? uv : found;
  }, 0);

  return {
    source: "nse",
    timestamp: json.timestamp ?? null,
    underlyingValue,
    data: rows,
  };
}
