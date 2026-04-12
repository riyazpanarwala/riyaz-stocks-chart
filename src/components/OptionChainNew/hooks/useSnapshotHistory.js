// ═══════════════════════════════════════════════════════════════
// useSnapshotHistory HOOK
// Manages the breakout-detector ring buffer of option-chain
// snapshots. Guarantees no duplicate pushes and resets on
// instrument / expiry change.
// ═══════════════════════════════════════════════════════════════
import { useRef, useEffect, useMemo } from "react";
import { pushSnapshot } from "../utils/breakoutDetector.js";
import { detectBreakouts } from "../utils/breakoutDetector.js";

/**
 * Build a stable string key that identifies a unique data snapshot.
 * Used to guard against identical consecutive pushes.
 */
function snapshotKey(rows, spot, pcr) {
  const rowPart = rows
    .map((r) => `${r.strikePrice}:${r.CE.openInterest}:${r.PE.openInterest}:${r.CE.changeinOpenInterest}:${r.PE.changeinOpenInterest}`)
    .join(";");
  return `${spot}|${Number(pcr).toFixed(4)}|${rowPart}`;
}

/**
 * @param {{
 *   rows:         import("../utils/parsers.js").OptionRow[],
 *   prevDisplayRows: import("../utils/parsers.js").OptionRow[],
 *   displayRows:  import("../utils/parsers.js").OptionRow[],
 *   underlyingValue: number,
 *   atm:          number,
 *   pcr:          number,
 *   maxPain:      number,
 *   instrument:   object,
 *   activeExpiry: string|null,
 * }} params
 * @returns {{ breakoutSignals: object[] }}
 */
export function useSnapshotHistory({
  rows, displayRows, prevDisplayRows,
  underlyingValue, atm, pcr, maxPain,
  instrument, activeExpiry,
}) {
  const historyRef      = useRef([]);
  const lastKeyRef      = useRef(null);
  const contractKeyRef  = useRef(null);

  const contractKey = `${instrument.symbol}:${activeExpiry ?? "index"}`;

  // ── Reset on instrument / expiry change ───────────────────
  useEffect(() => {
    if (contractKeyRef.current !== contractKey) {
      historyRef.current   = [];
      lastKeyRef.current   = null;
      contractKeyRef.current = contractKey;
    }
  }, [contractKey]);

  // ── Push new snapshot when data changes ───────────────────
  useEffect(() => {
    if (!rows.length || !underlyingValue) return;

    const key = snapshotKey(rows, underlyingValue, pcr);
    if (key === lastKeyRef.current) return;      // skip duplicate

    lastKeyRef.current  = key;
    historyRef.current  = pushSnapshot(historyRef.current, {
      rows, spot: underlyingValue, atm, pcr,
      ts: Date.now(), contractKey,
    });
  }, [rows, underlyingValue, atm, pcr, contractKey]);

  // ── Derive breakout signals ────────────────────────────────
  const breakoutSignals = useMemo(() => {
    if (!displayRows.length || !underlyingValue) return [];

    const history   = historyRef.current;
    const prev      = history.length >= 2 ? history[history.length - 2] : null;

    return detectBreakouts({
      rows:      displayRows,
      prevRows:  prev?.rows ?? prevDisplayRows,
      spot:      underlyingValue,
      prevSpot:  prev?.spot ?? 0,
      pcr,
      maxPain,
      snapshots: history,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRows, underlyingValue, pcr, maxPain, prevDisplayRows]);
  // NOTE: historyRef is intentionally omitted — it's a mutable ref, not reactive state.

  return { breakoutSignals };
}
