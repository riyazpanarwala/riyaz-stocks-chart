import { useState, useEffect, useMemo } from "react";
import { pushSnapshot, detectBreakouts } from "../utils/breakoutDetector.js";
import { isFresh, marketTimestamp } from "../utils/tradeRules.js";
import { sessionDate } from "../utils/analysis.js";

export function useSnapshotHistory({ rows, underlyingValue, atm, pcr, maxPain, instrument, activeExpiry,
  timestamp, candles, now, marketOpen }) {
  const [history,setHistory]=useState([]);
  const contractKey=instrument.symbol+":"+activeExpiry+":"+sessionDate(now);
  useEffect(()=>{
    if(!marketOpen || !rows?.length || !(underlyingValue>0) || !isFresh(timestamp,now)) return;
    setHistory(old=>pushSnapshot(old,{rows,spot:underlyingValue,atm,pcr,ts:marketTimestamp(timestamp),contractKey}));
  },[rows,underlyingValue,atm,pcr,timestamp,contractKey,now,marketOpen]);
  const breakoutSignals=useMemo(()=>detectBreakouts({rows,spot:underlyingValue,pcr,maxPain,
    snapshots:history.filter(s=>s.contractKey===contractKey),candles,timestamp,now,marketOpen}),
    [rows,underlyingValue,pcr,maxPain,history,contractKey,candles,timestamp,now,marketOpen]);
  return {breakoutSignals};
}
