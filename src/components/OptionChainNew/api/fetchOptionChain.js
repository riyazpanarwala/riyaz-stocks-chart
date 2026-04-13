// ═══════════════════════════════════════════════════════════════
// NSE API FETCH HELPERS
// All network I/O lives here. Components call these indirectly
// through the useOptionChain hook.
// ═══════════════════════════════════════════════════════════════
import { EMPTY_INDEX_DATA, EMPTY_STOCK_DATA } from "../constants.js";
import { getNSEData } from "../../getIntervalData.js"; // project-level import

/**
 * @typedef {{ type:"index"|"stock", symbol:string, lot:number, name:string }} Instrument
 */

/**
 * Fetch and normalise option-chain data for any instrument.
 *
 * For indices : returns { timestamp, underlyingValue, displayData, fullOI }
 * For stocks  : returns { timestamp, underlyingValue, data[] }
 *
 * Throws on network / parsing failures so the hook can surface errors cleanly.
 *
 * @param {Instrument} instrument
 * @returns {Promise<object>}
 */
export async function fetchOptionChain(instrument) {
  const isIndex = instrument.type === "index";
  const apiName = isIndex ? "F&O" : "optionChain";

  const json = await getNSEData(apiName, instrument.symbol);

  // getNSEData signals network/parse failure via { error: true }.
  // Throw immediately so the hook surfaces a clean error message instead of
  // silently mis-reading the error envelope as option-chain data.
  if (!json || json.error) {
    throw new Error(
      json?.message ?? "Failed to fetch option chain data from NSE",
    );
  }

  if (isIndex) {
    const rec = json.records ?? json;
    const allRows = (rec.data ?? [])
      .filter((r) => r.CE || r.PE)
      .sort((a, b) => a.strikePrice - b.strikePrice);

    const uv = rec.underlyingValue ?? 0;
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
      c: r.CE?.openInterest ?? 0,
      p: r.PE?.openInterest ?? 0,
    }));

    return {
      timestamp: rec.timestamp ?? new Date().toLocaleString("en-IN"),
      underlyingValue: uv,
      displayData,
      fullOI,
    };
  }

  // Stock — FIX #5: data[0] may be any row (PE/CE/any expiry) and its
  // underlyingValue can be 0 or missing.  Scan all rows for the first
  // finite, positive value so ATM / signal / support-resistance never
  // silently base themselves on 0.
  const rows = json.data ?? [];
  const underlyingValue = rows.reduce((found, r) => {
    if (found > 0) return found;
    const uv = Number.isFinite(r.underlyingValue) ? r.underlyingValue : 0;
    return uv > 0 ? uv : found;
  }, 0);

  return {
    timestamp: json.timestamp ?? new Date().toLocaleString("en-IN"),
    underlyingValue,
    data: rows,
  };
}
