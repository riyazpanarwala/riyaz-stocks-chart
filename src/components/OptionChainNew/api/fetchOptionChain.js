// ═══════════════════════════════════════════════════════════════
// NSE API FETCH HELPERS
// All network I/O lives here. Components call these indirectly
// through the useOptionChain hook.
// ═══════════════════════════════════════════════════════════════
import { EMPTY_INDEX_DATA, EMPTY_STOCK_DATA } from "../constants.js";
import { getNSEData } from "../../getIntervalData.js";  // project-level import

/**
 * @typedef {{ type:"index"|"stock", symbol:string, lot:string, name:string }} Instrument
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

  if (isIndex) {
    const rec    = json.records ?? json;
    const allRows = (rec.data ?? [])
      .filter((r) => r.CE || r.PE)
      .sort((a, b) => a.strikePrice - b.strikePrice);

    const uv     = rec.underlyingValue ?? 0;
    const atmIdx = allRows.reduce(
      (bi, r, i) => Math.abs(r.strikePrice - uv) < Math.abs(allRows[bi].strikePrice - uv) ? i : bi,
      0,
    );
    const displayData = allRows.slice(Math.max(0, atmIdx - 15), atmIdx + 16);
    const fullOI      = allRows.map((r) => ({
      s: r.strikePrice,
      c: r.CE?.openInterest ?? 0,
      p: r.PE?.openInterest ?? 0,
    }));

    return {
      timestamp:       rec.timestamp ?? new Date().toLocaleString("en-IN"),
      underlyingValue: uv,
      displayData,
      fullOI,
    };
  }

  // Stock
  return {
    timestamp:       json.timestamp ?? new Date().toLocaleString("en-IN"),
    underlyingValue: json.data?.[0]?.underlyingValue ?? 0,
    data:            json.data ?? [],
  };
}
