// ═══════════════════════════════════════════════════════════════
// useChainDerived HOOK
// Derives ALL computed values from raw API data.
// Centralises memoisation so child components don't recompute.
// ═══════════════════════════════════════════════════════════════
import { useMemo } from "react";
import {
  parseIndexChain, parseStockChain,
  calcPCRFull, calcPCR, calcMaxPain, calcMaxPainFull, findATM,
} from "../utils/parsers.js";
import { generateSignal } from "../utils/signalEngine.js";
import { NORMAL_RANGE, SCALP_RANGE } from "../constants.js";

/**
 * @param {{
 *   rawData:      object|null,
 *   prevRawData:  object|null,
 *   isIndex:      boolean,
 *   selectedExpiry: string|null,
 *   scalpMode:    boolean,
 * }} opts
 */
export function useChainDerived({ rawData, prevRawData, isIndex, selectedExpiry, scalpMode }) {
  // ── Parse current rows ─────────────────────────────────────
  const { rows, expiries, selectedExpiry: activeExpiry, underlyingValue } = useMemo(() => {
    if (!rawData) return { rows: [], expiries: [], selectedExpiry: null, underlyingValue: 0 };

    if (isIndex) {
      return {
        rows:           parseIndexChain(rawData),
        expiries:       [],
        selectedExpiry: null,
        underlyingValue: rawData.underlyingValue ?? 0,
      };
    }

    const parsed = parseStockChain(rawData, selectedExpiry);
    return {
      rows:           parsed.rows,
      expiries:       parsed.expiries,
      selectedExpiry: parsed.selectedExpiry,
      underlyingValue: rawData.underlyingValue ?? 0,
    };
  }, [rawData, isIndex, selectedExpiry]);

  // ── Parse previous rows (for diff analysis) ────────────────
  const prevRows = useMemo(() => {
    if (!prevRawData) return [];
    if (isIndex) return parseIndexChain(prevRawData);
    return parseStockChain(prevRawData, selectedExpiry).rows;
  }, [prevRawData, isIndex, selectedExpiry]);

  // ── Derived scalars ────────────────────────────────────────
  const atm = useMemo(() => findATM(rows, underlyingValue), [rows, underlyingValue]);

  // Use the already-parsed `rows` instead of re-calling parseStockChain here.
  // `rows` is the full unfiltered set; `displayRows` (range-filtered) is derived
  // later, so PCR is never skewed by scalp-mode.
  const pcr = useMemo(() => {
    if (isIndex) return calcPCRFull(rawData?.fullOI);
    return calcPCR(rows);
  }, [isIndex, rawData, rows]);

  const maxPain = useMemo(() => {
    try {
      return isIndex ? calcMaxPainFull(rawData?.fullOI) : calcMaxPain(rows);
    } catch (err) {
      // Surface failures during development; stay silent in production to avoid
      // polluting user consoles.  The app renders fine with maxPain = 0.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[useChainDerived] maxPain calculation failed:", err, { isIndex, rows });
      }
      return 0;
    }
  }, [isIndex, rawData, rows]);

  // ── Range filter (scalp vs normal) ────────────────────────
  const range = scalpMode
    ? (isIndex ? SCALP_RANGE.index  : SCALP_RANGE.stock)
    : (isIndex ? NORMAL_RANGE.index : NORMAL_RANGE.stock);

  const displayRows = useMemo(
    () => rows.filter((r) => Math.abs(r.strikePrice - atm) <= range),
    [rows, atm, range],
  );

  const prevDisplayRows = useMemo(
    () => prevRows.filter((r) => Math.abs(r.strikePrice - atm) <= range),
    [prevRows, atm, range],
  );

  // ── Top-level signal ───────────────────────────────────────
  const sig = useMemo(
    () => (rows.length ? generateSignal(rows, atm, pcr, underlyingValue) : null),
    [rows, atm, pcr, underlyingValue],
  );

  // ── Chart data (memoised without `sig` — avoids spurious recomputes) ──
  const chartData = useMemo(
    () => displayRows.map((r) => ({
      strike:   r.strikePrice,
      "Call OI": r.CE.openInterest,
      "Put OI":  r.PE.openInterest,
      "CE ΔOI":  r.CE.changeinOpenInterest,
      "PE ΔOI":  r.PE.changeinOpenInterest,
      isATM:     r.strikePrice === atm,
    })),
    [displayRows, atm],
  );

  return {
    rows, prevRows, displayRows, prevDisplayRows,
    expiries, activeExpiry, underlyingValue,
    atm, pcr, maxPain, sig, chartData,
  };
}
