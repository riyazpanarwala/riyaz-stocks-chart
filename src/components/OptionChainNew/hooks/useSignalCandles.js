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

export function useSignalCandles(instrument, intervalMinutes = 5) {
  const normalizedInterval = Math.max(1, Number(intervalMinutes) || 5);
  const [data, setData] = useState({ symbol: null, intervalMinutes: normalizedInterval, candles: [] });
  useEffect(() => {
    let cancelled = false;
    const yahooSymbol = resolveYahooTicker(instrument);
    if (!yahooSymbol) {
      setData({ symbol: instrument.symbol, intervalMinutes: normalizedInterval, candles: [] });
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
          setData({ symbol: instrument.symbol, intervalMinutes: normalizedInterval, candles: normalizeShoonyaCandles(rawCandles) });
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
          setData({ symbol: instrument.symbol, intervalMinutes: normalizedInterval, candles: Array.isArray(result) ? result : [] });
        }
      } catch {
        if (!cancelled) {
          setData((prev) =>
            prev.symbol === instrument.symbol && prev.intervalMinutes === normalizedInterval
              ? prev
              : { symbol: instrument.symbol, intervalMinutes: normalizedInterval, candles: [] },
          );
        }
      }
    };

    fetchCandles();
    const id = setInterval(fetchCandles, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [instrument.symbol, instrument.type, normalizedInterval]);
  return data.symbol === instrument.symbol && data.intervalMinutes === normalizedInterval ? data.candles : [];
}
