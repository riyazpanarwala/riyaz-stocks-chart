import { useEffect, useState } from "react";
import { getFinanceDataAction } from "../../../app/actions/finance.js";
import { getShoonyaCandlesAction } from "../../../app/actions/shoonyaCandles.js";
import { REFRESH_MS, resolveYahooTicker } from "../constants.js";

function toShoonyaInstrumentKey(instrument) {
  if (!instrument?.symbol) return "NSE_INDEX|NIFTY";
  const sym = instrument.symbol.toUpperCase();
  if (sym === "SENSEX" || sym === "BANKEX") return `BSE_INDEX|${sym}`;
  if (instrument.type === "index") return `NSE_INDEX|${sym}`;
  return `NSE_EQ|${sym}`;
}

function normalizeShoonyaCandles(candles = []) {
  return candles
    .filter((c) => Array.isArray(c) && c[0] && Number.isFinite(Number(c[4])))
    .map((c) => ({
      date: c[0],
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5] || 0),
    }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function useSignalCandles(instrument, intervalMinutes = 5, { spot = 0, isWsConnected = false } = {}) {
  const normalizedInterval = Math.max(1, Number(intervalMinutes) || 5);
  const [data, setData] = useState({ symbol: null, intervalMinutes: normalizedInterval, loaded: false, candles: [] });

  useEffect(() => {
    let cancelled = false;
    const yahooSymbol = resolveYahooTicker(instrument);
    if (!yahooSymbol) {
      setData({ symbol: instrument.symbol, intervalMinutes: normalizedInterval, loaded: true, candles: [] });
      return;
    }

    const instrumentKey = toShoonyaInstrumentKey(instrument);
    const yahooInterval = normalizedInterval === 3 ? "2m" : `${normalizedInterval}m`;

    const fetchCandles = async () => {
      try {
        const shoonyaRes = await getShoonyaCandlesAction({
          type: "intraday",
          instrumentKey,
          interval: "minutes",
          apiInterval: normalizedInterval,
        });
        if (cancelled) return;
        const rawCandles = shoonyaRes?.data?.candles;
        if (Array.isArray(rawCandles) && rawCandles.length > 0) {
          setData({ symbol: instrument.symbol, intervalMinutes: normalizedInterval, loaded: true, candles: normalizeShoonyaCandles(rawCandles) });
          return;
        }
      } catch {
        // Fall through to Yahoo Finance
      }

      try {
        const result = await getFinanceDataAction({
          symbol: yahooSymbol,
          interval: yahooInterval,
          fromDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        });
        if (!cancelled) {
          setData({ symbol: instrument.symbol, intervalMinutes: normalizedInterval, loaded: true, candles: Array.isArray(result) ? result : [] });
        }
      } catch {
        if (!cancelled) {
          setData((prev) =>
            prev.symbol === instrument.symbol && prev.intervalMinutes === normalizedInterval
              ? { ...prev, loaded: true }
              : { symbol: instrument.symbol, intervalMinutes: normalizedInterval, loaded: true, candles: [] },
          );
        }
      }
    };

    fetchCandles();
    // Only poll periodically when WebSocket is not connected; when WS is live, ticks update candles in real time
    if (isWsConnected) {
      return () => { cancelled = true; };
    }
    const id = setInterval(fetchCandles, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [instrument.symbol, instrument.type, normalizedInterval, isWsConnected]);

  // Update/roll live candles directly from WebSocket spot ticks
  useEffect(() => {
    if (!isWsConnected || !Number.isFinite(spot) || spot <= 0) return;

    const intervalMs = normalizedInterval * 60_000;
    const nowMs = Date.now();
    const bucketStartMs = Math.floor(nowMs / intervalMs) * intervalMs;

    setData((prev) => {
      if (prev.symbol !== instrument.symbol || prev.intervalMinutes !== normalizedInterval || !prev.loaded) {
        return prev;
      }
      const list = prev.candles;
      const last = list[list.length - 1];
      const lastTs = last ? Date.parse(last.date) : NaN;

      if (Number.isFinite(lastTs) && lastTs === bucketStartMs) {
        const nextHigh = Math.max(last.high, spot);
        const nextLow = Math.min(last.low, spot);
        if (last.close === spot && last.high === nextHigh && last.low === nextLow) return prev;
        const updated = [...list];
        updated[updated.length - 1] = { ...last, high: nextHigh, low: nextLow, close: spot };
        return { ...prev, candles: updated };
      }

      if (!Number.isFinite(lastTs) || bucketStartMs > lastTs) {
        const newBar = {
          date: new Date(bucketStartMs).toISOString(),
          open: spot,
          high: spot,
          low: spot,
          close: spot,
          volume: 0,
        };
        const updated = list.length >= 300 ? [...list.slice(-299), newBar] : [...list, newBar];
        return { ...prev, candles: updated };
      }

      return prev;
    });
  }, [spot, isWsConnected, instrument.symbol, normalizedInterval]);

  return data.symbol === instrument.symbol && data.intervalMinutes === normalizedInterval ? data.candles : [];
}
