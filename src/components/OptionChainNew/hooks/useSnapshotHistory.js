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
 * Fast 32-bit integer checksum across option chain snapshot metrics and rows.
 * Eliminates all string allocations and string joining during polling ticks.
 */
function snapshotChecksum(rows, spot, pcr) {
  let hash = 17;
  hash = (hash * 31 + Math.round((spot || 0) * 100)) | 0;
  hash = (hash * 31 + Math.round((pcr || 0) * 10000)) | 0;
  hash = (hash * 31 + rows.length) | 0;

  const len = rows.length;
  for (let i = 0; i < len; i++) {
    const r = rows[i];
    hash = (hash * 31 + (r.strikePrice || 0)) | 0;
    hash = (hash * 31 + (r.CE?.openInterest || 0)) | 0;
    hash = (hash * 31 + (r.PE?.openInterest || 0)) | 0;
    hash = (hash * 31 + (r.CE?.changeinOpenInterest || 0)) | 0;
    hash = (hash * 31 + (r.PE?.changeinOpenInterest || 0)) | 0;
  }
  return hash;
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
  const lastChecksumRef = useRef(null);
  const contractKeyRef  = useRef(null);

  const contractKey = `${instrument.symbol}:${activeExpiry ?? "index"}`;

  // ── Reset on instrument / expiry change ───────────────────
  useEffect(() => {
    if (contractKeyRef.current !== contractKey) {
      historyRef.current      = [];
      lastChecksumRef.current = null;
      contractKeyRef.current  = contractKey;
    }
  }, [contractKey]);

  // ── Push new snapshot when data changes ───────────────────
  useEffect(() => {
    if (!rows?.length || !underlyingValue) return;

    const checksum = snapshotChecksum(rows, underlyingValue, pcr);
    if (checksum === lastChecksumRef.current) return; // skip duplicate

    lastChecksumRef.current = checksum;
    historyRef.current      = pushSnapshot(historyRef.current, {
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
  }, [displayRows, underlyingValue, pcr, maxPain, prevDisplayRows]);
  // NOTE: historyRef is intentionally omitted — it's a mutable ref, not reactive state.

  return { breakoutSignals };
}
