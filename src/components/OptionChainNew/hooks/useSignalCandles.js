import { useEffect, useState } from "react";
import { getFinanceDataAction } from "../../../app/actions/finance.js";
import { REFRESH_MS, resolveYahooTicker } from "../constants.js";

export function useSignalCandles(instrument) {
  const [data, setData] = useState({ symbol: null, candles: [] });
  useEffect(() => {
    let cancelled = false;
    const symbol = resolveYahooTicker(instrument);
    if (!symbol) {
      setData({ symbol: instrument.symbol, candles: [] });
      return;
    }

    const fetchCandles = () => {
      getFinanceDataAction({ symbol, interval: "5m", fromDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10) })
        .then((result) => {
          if (!cancelled) setData({ symbol: instrument.symbol, candles: Array.isArray(result) ? result : [] });
        })
        .catch(() => {
          if (!cancelled) setData((prev) => prev.symbol === instrument.symbol ? prev : { symbol: instrument.symbol, candles: [] });
        });
    };

    fetchCandles();
    const id = setInterval(fetchCandles, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [instrument.symbol]);
  return data.symbol === instrument.symbol ? data.candles : [];
}
