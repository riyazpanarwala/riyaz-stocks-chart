import { useEffect, useState } from "react";
import { getFinanceDataAction } from "../../../app/actions/finance.js";

export function useSignalCandles(instrument, fetchedAt) {
  const [data, setData] = useState({ symbol: null, candles: [] });
  useEffect(() => {
    let cancelled = false;
    const indices = { NIFTY: "^NSEI", BANKNIFTY: "^NSEBANK", FINNIFTY: "NIFTY_FIN_SERVICE.NS", MIDCPNIFTY: "NIFTY_MID_SELECT.NS", NIFTYNXT50: "NIFTY_NEXT_50.NS" };
    const symbol = indices[instrument.symbol] ?? `${instrument.symbol}.NS`;
    getFinanceDataAction({ symbol, interval: "5m", fromDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10) })
      .then((result) => { if (!cancelled) setData({ symbol: instrument.symbol, candles: Array.isArray(result) ? result : [] }); })
      .catch(() => { if (!cancelled) setData({ symbol: instrument.symbol, candles: [] }); });
    return () => { cancelled = true; };
  }, [instrument.symbol, fetchedAt]);
  return data.symbol === instrument.symbol ? data.candles : [];
}
