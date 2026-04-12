// ═══════════════════════════════════════════════════════════════
// useOptionChain HOOK
// Encapsulates all data-fetching, refresh-cycle, and state for
// a single option-chain instrument.
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";
import { REFRESH_MS } from "../constants.js";
import { isMarketOpen, isHoliday } from "../../utils/indianstockmarket.js";
import { fetchOptionChain } from "../api/fetchOptionChain.js";

/**
 * @typedef {{ open:boolean, label:string }} MarketStatus
 */

function getMarketStatusLabel() {
  if (isHoliday())    return { open: false, label: "Holiday" };
  if (isMarketOpen()) return { open: true,  label: "Market open · live" };
  return { open: false, label: "Market closed" };
}

/**
 * @param {import("../constants.js").Instrument} instrument
 * @returns {{
 *   rawData:    object|null,
 *   prevRawData:object|null,
 *   loading:    boolean,
 *   error:      string|null,
 *   fetchedAt:  number|null,
 *   retry:      () => void,
 *   mktStatus:  MarketStatus,
 * }}
 */
export function useOptionChain(instrument) {
  const [rawData,     setRawData]     = useState(null);
  const [prevRawData, setPrevRawData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [fetchedAt,   setFetchedAt]   = useState(null);
  const [mktStatus,   setMktStatus]   = useState(() => getMarketStatusLabel());

  /**
   * Monotonically-increasing counter — any response with an ID less than the
   * current value is stale and must be discarded. This prevents race conditions
   * when multiple overlapping fetches are in-flight.
   */
  const latestRequestRef  = useRef(0);
  const closedFetchDone   = useRef(false);

  const load = useCallback(async (inst, resetPrev = false) => {
    const requestId = ++latestRequestRef.current;

    if (resetPrev) {
      setRawData(null);
      setPrevRawData(null);
      closedFetchDone.current = false;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOptionChain(inst);

      if (latestRequestRef.current !== requestId) return; // stale

      setRawData((cur) => {
        // Keep a window of exactly one previous snapshot for diff analysis
        if (cur && cur.timestamp) setPrevRawData(cur);
        return data;
      });
      setFetchedAt(Date.now());
      setError(null);
    } catch (err) {
      if (latestRequestRef.current !== requestId) return; // stale
      setError(err?.message ?? "Failed to fetch option chain");
    } finally {
      if (latestRequestRef.current === requestId) setLoading(false);
    }
  }, []); // no deps — stable across renders

  // ── Initial load + symbol change ──────────────────────────
  useEffect(() => {
    closedFetchDone.current = !isMarketOpen();
    load(instrument, true);
  }, [instrument, load]);

  // ── Auto-refresh cycle ─────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      setMktStatus(getMarketStatusLabel());
      if (isMarketOpen()) {
        closedFetchDone.current = false;
        load(instrument);
      } else if (!closedFetchDone.current) {
        closedFetchDone.current = true;
        load(instrument);
      }
    };
    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [instrument, load]);

  // ── Market-status ticker (independent of data refresh) ────
  useEffect(() => {
    const id = setInterval(() => setMktStatus(getMarketStatusLabel()), 60_000);
    return () => clearInterval(id);
  }, []);

  const retry = useCallback(() => load(instrument), [instrument, load]);

  return { rawData, prevRawData, loading, error, fetchedAt, retry, mktStatus };
}
