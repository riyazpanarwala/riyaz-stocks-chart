// ═══════════════════════════════════════════════════════════════
// useMaxPainPcrTrend HOOK
// Manages real-time intraday snapshots of PCR and Max Pain,
// auto-persists to localStorage with automatic cleanup,
// and derives loss curves, trend velocity, and divergence metrics.
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  calcMaxPainCurve,
  calcMaxPainCurveFull,
  calcVolumePCR,
  calcVolumePCRFull,
  analyzePcrTrend,
  getPcrSentiment,
  buildStorageKey,
  loadStoredSnapshots,
  saveStoredSnapshots,
  pruneExpiredPcrStorage,
  formatIstTime,
  MAX_STORED_SNAPSHOTS,
} from "../utils/maxPainPcrEngine.js";

/**
 * @param {object} params
 * @param {object} params.instrument - Active instrument { symbol, name, type, ... }
 * @param {string|null} params.activeExpiry - Selected expiry date string
 * @param {Array<object>} params.rows - Parsed OptionRow array
 * @param {Array<object>} [params.fullOI] - Full OI records for indices
 * @param {boolean} params.isIndex - True if instrument is an index
 * @param {number} params.underlyingValue - Current spot price
 * @param {number} params.atm - Nearest ATM strike
 * @param {number} params.pcr - Open Interest Put-Call Ratio
 * @param {number} params.maxPain - Current Max Pain strike
 * @param {number|null} [params.fetchedAt] - Timestamp when data was fetched
 */
export function useMaxPainPcrTrend({
  instrument,
  activeExpiry,
  rows = [],
  fullOI = [],
  isIndex = false,
  underlyingValue = 0,
  atm = 0,
  pcr = 0,
  maxPain = 0,
  fetchedAt = null,
}) {
  const [snapshots, setSnapshots] = useState([]);
  const lastSnapshotRef = useRef(null);

  const contractKey = `${instrument?.symbol || "UNKNOWN"}:${activeExpiry ?? "index"}`;
  const storageKey = useMemo(
    () => buildStorageKey(instrument?.symbol, activeExpiry),
    [instrument?.symbol, activeExpiry]
  );

  // ── 1. One-time background cleanup on mount ───────────────────────────
  useEffect(() => {
    pruneExpiredPcrStorage();
  }, []);

  // ── 2. Load stored session data on instrument / expiry change ──────────
  useEffect(() => {
    const existing = loadStoredSnapshots(storageKey);
    setSnapshots(existing);
    lastSnapshotRef.current = existing[existing.length - 1] || null;
  }, [storageKey]);

  // ── 3. Calculate Volume PCR ───────────────────────────────────────────
  const volPcr = useMemo(() => {
    if (isIndex && fullOI?.length) {
      return calcVolumePCRFull(fullOI);
    }
    return calcVolumePCR(rows);
  }, [isIndex, fullOI, rows]);

  // ── 4. Calculate Max Pain Loss Distribution Curve ─────────────────────
  const maxPainCurveData = useMemo(() => {
    if (isIndex && fullOI?.length) {
      return calcMaxPainCurveFull(fullOI);
    }
    return calcMaxPainCurve(rows);
  }, [isIndex, fullOI, rows]);

  // ── 5. Record new snapshot upon data refresh ─────────────────────────
  useEffect(() => {
    if (!underlyingValue || underlyingValue <= 0 || !pcr || pcr <= 0) return;

    const now = Date.now();
    const last = lastSnapshotRef.current;

    // Check duplicate: if spot, pcr, and maxPain are practically unchanged and within 15 seconds, skip
    if (last) {
      const isSpotSame = Math.abs(last.spot - underlyingValue) < 0.05;
      const isPcrSame = Math.abs(last.pcr - pcr) < 0.001;
      const isMaxPainSame = last.maxPain === maxPain;
      const isTooSoon = now - last.ts < 15_000;

      if (isSpotSame && isPcrSame && isMaxPainSame && isTooSoon) {
        return;
      }
    }

    // Compute totals
    let totalCeOi = 0;
    let totalPeOi = 0;
    if (isIndex && fullOI?.length) {
      totalCeOi = fullOI.reduce((acc, r) => acc + (Number(r.c) || 0), 0);
      totalPeOi = fullOI.reduce((acc, r) => acc + (Number(r.p) || 0), 0);
    } else if (rows?.length) {
      totalCeOi = rows.reduce((acc, r) => acc + (Number(r.CE?.openInterest) || 0), 0);
      totalPeOi = rows.reduce((acc, r) => acc + (Number(r.PE?.openInterest) || 0), 0);
    }

    const newSnapshot = {
      ts: now,
      time: formatIstTime(now),
      spot: underlyingValue,
      pcr: Number(pcr.toFixed(3)),
      volPcr: Number(Number.isFinite(volPcr) ? volPcr.toFixed(3) : pcr.toFixed(3)),
      maxPain: maxPain || atm,
      atm,
      totalCeOi,
      totalPeOi,
    };

    lastSnapshotRef.current = newSnapshot;

    setSnapshots((prev) => {
      // If previous snapshot was within 30s and has identical spot & pcr, update in place
      const lastItem = prev[prev.length - 1];
      let updated;
      if (
        lastItem &&
        Math.abs(lastItem.spot - underlyingValue) < 0.01 &&
        Math.abs(lastItem.pcr - pcr) < 0.001 &&
        now - lastItem.ts < 30_000
      ) {
        updated = [...prev.slice(0, -1), newSnapshot];
      } else {
        updated = [...prev, newSnapshot];
      }

      if (updated.length > MAX_STORED_SNAPSHOTS) {
        updated = updated.slice(-MAX_STORED_SNAPSHOTS);
      }

      saveStoredSnapshots(storageKey, updated);
      return updated;
    });
  }, [
    underlyingValue,
    pcr,
    volPcr,
    maxPain,
    atm,
    isIndex,
    fullOI,
    rows,
    storageKey,
    fetchedAt,
  ]);

  // ── 6. Synthesize initial historical points if session just opened ────
  const displaySnapshots = useMemo(() => {
    if (snapshots.length >= 2) return snapshots;
    if (snapshots.length === 1 && underlyingValue > 0) {
      // If only 1 snapshot exists, create an initial anchor 15m earlier with slight offset
      // so charts can render meaningful axes rather than a single collapsed point
      const s0 = snapshots[0];
      const anchor = {
        ts: s0.ts - 15 * 60 * 1000,
        time: formatIstTime(s0.ts - 15 * 60 * 1000),
        spot: s0.spot,
        pcr: s0.pcr,
        volPcr: s0.volPcr,
        maxPain: s0.maxPain,
        atm: s0.atm,
        totalCeOi: s0.totalCeOi,
        totalPeOi: s0.totalPeOi,
        isSyntheticAnchor: true,
      };
      return [anchor, s0];
    }
    return snapshots;
  }, [snapshots, underlyingValue]);

  // ── 7. Analyze trend, divergence, velocity ─────────────────────────────
  const trendMetrics = useMemo(() => {
    return analyzePcrTrend(displaySnapshots, underlyingValue, maxPain);
  }, [displaySnapshots, underlyingValue, maxPain]);

  // ── 8. PCR Sentiment Badge & Summary ──────────────────────────────────
  const pcrSentiment = useMemo(() => {
    return getPcrSentiment(pcr);
  }, [pcr]);

  // ── 9. Clear session history action ───────────────────────────────────
  const clearHistory = useCallback(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(storageKey);
    }
    setSnapshots([]);
    lastSnapshotRef.current = null;
  }, [storageKey]);

  return {
    snapshots: displaySnapshots,
    rawSnapshotsCount: snapshots.length,
    trendMetrics,
    pcrSentiment,
    volPcr,
    maxPainCurve: maxPainCurveData.curve,
    maxPainCalculated: maxPainCurveData.maxPainStrike,
    clearHistory,
  };
}
