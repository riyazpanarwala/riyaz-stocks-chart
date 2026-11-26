// ═══════════════════════════════════════════════════════════════
// useOptionChain HOOK
// Encapsulates data fetching, Shoonya WebSocket live ticks,
// auto-refresh cycle, and graceful NSE fallback.
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { REFRESH_MS } from "../constants.js";
import { isMarketOpen, isMcxMarketOpen, isHoliday } from "../../utils/indianstockmarket.js";
import { fetchOptionChain } from "../api/fetchOptionChain.js";
import { useShoonyaWebSocket } from "./useShoonyaWebSocket.js";

/**
 * @typedef {{ open:boolean, label:string }} MarketStatus
 */

function cloneChainSnapshot(snapshot) {
  if (!snapshot) return null;
  const cloneRows = (list) =>
    Array.isArray(list)
      ? list.map((r) => ({
          ...r,
          CE: r.CE ? { ...r.CE } : r.CE,
          PE: r.PE ? { ...r.PE } : r.PE,
        }))
      : list;
  return {
    ...snapshot,
    displayData: cloneRows(snapshot.displayData),
    fullData: cloneRows(snapshot.fullData),
    fullOI: Array.isArray(snapshot.fullOI) ? snapshot.fullOI.map((item) => ({ ...item })) : snapshot.fullOI,
  };
}

function checkMarketOpen(isCommodity) {
  return isCommodity ? isMcxMarketOpen() : isMarketOpen();
}

function getMarketStatusLabel(isCommodity = false) {
  if (isHoliday()) return { open: false, label: "Holiday" };
  if (checkMarketOpen(isCommodity)) return { open: true, label: isCommodity ? "MCX open · live" : "Market open · live" };
  return { open: false, label: "Market closed" };
}

/**
 * @param {import("../constants.js").Instrument} instrument
 * @param {string|null} [selectedExpiry]
 * @returns {{
 *   rawData:       object|null,
 *   prevRawData:   object|null,
 *   loading:       boolean,
 *   error:         string|null,
 *   fetchedAt:     number|null,
 *   retry:         () => void,
 *   mktStatus:     MarketStatus,
 *   dataSource:    "shoonya" | "nse",
 *   isWsConnected: boolean,
 *   wsStatus:      string,
 * }}
 */
export function useOptionChain(instrument, selectedExpiry = null) {
  const [rawData, setRawData] = useState(null);
  const [prevRawData, setPrevRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const isCommodity = instrument?.type === "commodity";
  const [mktStatus, setMktStatus] = useState(() => getMarketStatusLabel(isCommodity));

  const latestRequestRef = useRef(0);
  const closedFetchDone = useRef(false);
  const rawDataRef = useRef(null);
  const snapshotHistoryRef = useRef([]);
  const lastSampleAtRef = useRef(0);
  const lastRestSyncAtRef = useRef(0);

  const dataSource = rawData?.source || "nse";
  const isShoonya = dataSource === "shoonya";

  // ── Load Option Chain ──────────────────────────────────────
  const load = useCallback(async (inst, resetPrev = false, expiryOverride = null, { silent = false } = {}) => {
    const requestId = ++latestRequestRef.current;

    if (resetPrev) {
      rawDataRef.current = null;
      snapshotHistoryRef.current = [];
      lastSampleAtRef.current = 0;
      lastRestSyncAtRef.current = 0;
      setRawData(null);
      setPrevRawData(null);
      closedFetchDone.current = false;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await fetchOptionChain(inst, expiryOverride);

      if (latestRequestRef.current !== requestId) return; // stale

      const nowMs = Date.now();
      lastRestSyncAtRef.current = nowMs;

      if (rawDataRef.current?.timestamp) {
        const clonedPrev = cloneChainSnapshot(rawDataRef.current);
        snapshotHistoryRef.current = snapshotHistoryRef.current.filter((s) => nowMs - s.at <= 105_000);
        snapshotHistoryRef.current.push({ at: nowMs, data: clonedPrev });
        lastSampleAtRef.current = nowMs;
        setPrevRawData(snapshotHistoryRef.current[0].data);
      }
      rawDataRef.current = data;
      setRawData(data);
      setFetchedAt(nowMs);

      if (!checkMarketOpen(inst?.type === "commodity")) {
        closedFetchDone.current = true;
      }
      setError(null);
    } catch (err) {
      if (latestRequestRef.current !== requestId) return; // stale
      if (!silent) {
        closedFetchDone.current = false;
        setError(err?.message ?? "Failed to fetch option chain");
      }
    } finally {
      if (!silent && latestRequestRef.current === requestId) setLoading(false);
    }
  }, []);

  // ── Initial load + symbol change ──────────────────────────
  useEffect(() => {
    closedFetchDone.current = false;
    setMktStatus(getMarketStatusLabel(instrument?.type === "commodity"));
    load(instrument, true, null);
  }, [instrument, load]);

  // ── Expiry change re-fetch for Shoonya ─────────────────────
  const prevSelectedExpiryRef = useRef(selectedExpiry);
  useEffect(() => {
    if (prevSelectedExpiryRef.current === selectedExpiry) return;
    prevSelectedExpiryRef.current = selectedExpiry;

    if (selectedExpiry && rawDataRef.current?.source === "shoonya" && rawDataRef.current?.expiry !== selectedExpiry) {
      load(instrument, false, selectedExpiry);
    }
  }, [selectedExpiry, instrument, load]);

  // ── Shoonya WebSocket Integration (Real-Time Ticks) ──────
  // Extract token subscription keys only if source is Shoonya
  const tokenKeys = useMemo(() => {
    if (isShoonya && Array.isArray(rawData?.tokenKeys)) {
      return rawData.tokenKeys;
    }
    return [];
  }, [isShoonya, rawData?.tokenKeys]);

  // Batched tick buffer to keep React UI smooth under heavy tick load
  const tickBufferRef = useRef([]);
  const throttleTimerRef = useRef(null);

  const applyBatchedTicks = useCallback(() => {
    throttleTimerRef.current = null;
    const ticks = tickBufferRef.current;
    if (ticks.length === 0 || !rawDataRef.current) return;
    tickBufferRef.current = [];

    const current = rawDataRef.current;
    if (current.source !== "shoonya") return;

    const next = cloneChainSnapshot(current);
    let hasChanges = false;
    const rows = next.fullData || next.displayData || [];
    const fullOI = next.fullOI || [];

    for (const tick of ticks) {
      // 1. Check if tick is for underlying spot
      if (next.spotKey && `${tick.exchange}|${tick.token}` === next.spotKey) {
        if (tick.ltp != null && tick.ltp > 0 && next.underlyingValue !== tick.ltp) {
          next.underlyingValue = tick.ltp;
          hasChanges = true;
        }
      }

      // 2. Check if tick is an option strike token
      const meta = next.tokenMap?.[tick.token];
      if (meta) {
        const { strikePrice, optt } = meta;
        const row = rows.find((r) => r.strikePrice === strikePrice);
        if (row && row[optt]) {
          const leg = row[optt];
          if (tick.ltp != null) {
            leg.lastPrice = tick.ltp;
            if (tick.close != null) leg.change = tick.ltp - tick.close;
            hasChanges = true;
          }
          if (tick.volume != null) { leg.totalTradedVolume = tick.volume; hasChanges = true; }
          if (tick.oi != null) { leg.openInterest = tick.oi; hasChanges = true; }
          if (tick.bid != null) leg.bidprice = tick.bid;
          if (tick.ask != null) leg.askPrice = tick.ask;
        }

        // Update fullOI record
        const oiItem = fullOI.find((item) => item.s === strikePrice);
        if (oiItem) {
          if (optt === "CE") {
            if (tick.oi != null) oiItem.c = tick.oi;
            if (tick.volume != null) oiItem.cVol = tick.volume;
          } else if (optt === "PE") {
            if (tick.oi != null) oiItem.p = tick.oi;
            if (tick.volume != null) oiItem.pVol = tick.volume;
          }
        }
      }
    }

    if (hasChanges) {
      const nowMs = Date.now();
      if (current.timestamp) {
        snapshotHistoryRef.current = snapshotHistoryRef.current.filter((s) => nowMs - s.at <= 105_000);
        if (snapshotHistoryRef.current.length === 0 || nowMs - lastSampleAtRef.current >= 15_000) {
          snapshotHistoryRef.current.push({ at: nowMs, data: cloneChainSnapshot(current) });
          lastSampleAtRef.current = nowMs;
        }
        setPrevRawData(snapshotHistoryRef.current[0].data);
      }

      next.timestamp = new Date(nowMs).toISOString();
      next.displayData = [...rows];
      next.fullData = next.fullData ? [...next.fullData] : next.fullData;
      next.fullOI = [...fullOI];
      rawDataRef.current = next;
      setRawData(next);
      setFetchedAt(nowMs);
    }
  }, []);

  const handleTick = useCallback((tick) => {
    tickBufferRef.current.push(tick);
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(applyBatchedTicks, 150);
    }
  }, [applyBatchedTicks]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  // WebSocket active only when Shoonya is the active data source
  const { isConnected: isWsConnected, status: wsStatus } = useShoonyaWebSocket({
    enabled: isShoonya && tokenKeys.length > 0,
    tokenKeys,
    onTick: handleTick,
  });

  // ── Auto-refresh cycle (Polling for NSE fallback) ────────
  useEffect(() => {
    const tick = () => {
      setMktStatus(getMarketStatusLabel(isCommodity));

      // If Shoonya WebSocket is live, only sync REST quotes (at most every 90s) if the current ATM strike is missing bid/ask
      // If running on NSE fallback (or Shoonya WS is disconnected), poll via REFRESH_MS
      const isShoonyaWsLive = isShoonya && isWsConnected;
      if (isShoonyaWsLive) {
        if (checkMarketOpen(isCommodity) && Date.now() - lastRestSyncAtRef.current >= 90_000) {
          const cur = rawDataRef.current;
          const curRows = cur?.fullData || cur?.displayData || [];
          const spot = cur?.underlyingValue || 0;
          const atmRow = curRows.length && spot > 0
            ? curRows.reduce((best, r) =>
                Math.abs(r.strikePrice - spot) < Math.abs(best.strikePrice - spot) ? r : best,
              curRows[0])
            : null;
          const missingBidAsk = atmRow && (
            !(atmRow.CE?.bidprice > 0 && atmRow.CE?.askPrice > 0) ||
            !(atmRow.PE?.bidprice > 0 && atmRow.PE?.askPrice > 0)
          );
          if (missingBidAsk) {
            load(instrument, false, selectedExpiry, { silent: true });
          }
        }
      } else {
        if (checkMarketOpen(isCommodity)) {
          closedFetchDone.current = false;
          load(instrument, false, selectedExpiry);
        } else if (!closedFetchDone.current) {
          load(instrument, false, selectedExpiry);
        }
      }
    };

    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [instrument, load, selectedExpiry, isShoonya, isWsConnected, isCommodity]);

  // ── Market-status ticker ──────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setMktStatus(getMarketStatusLabel(isCommodity)), 60_000);
    return () => clearInterval(id);
  }, [isCommodity]);

  const retry = useCallback(() => load(instrument, false, selectedExpiry), [instrument, load, selectedExpiry]);

  return {
    rawData,
    prevRawData,
    loading,
    error,
    fetchedAt,
    retry,
    mktStatus,
    dataSource,
    isWsConnected,
    wsStatus,
  };
}
