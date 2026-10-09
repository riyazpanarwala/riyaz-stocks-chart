import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { calcMaxPainCurve, calcMaxPainCurveFull, calcVolumePCR, calcVolumePCRFull, analyzePcrTrend,
  getPcrSentiment, buildStorageKey, loadStoredSnapshots, saveStoredSnapshots, pruneExpiredPcrStorage,
  formatIstTime, MAX_STORED_SNAPSHOTS } from "../utils/maxPainPcrEngine.js";
import { isFresh, marketTimestamp } from "../utils/tradeRules.js";
import { sessionDate, sumMetric } from "../utils/analysis.js";

export function useMaxPainPcrTrend({instrument,activeExpiry,rows=[],fullOI=[],isIndex=false,underlyingValue=0,
  atm=0,pcr=null,maxPain=0,timestamp,now=Date.now(),marketOpen=false}) {
  const [stored,setStored]=useState({key:null,items:[]});
  const loadedKey=useRef(null);
  const storageKey=buildStorageKey(instrument?.symbol,activeExpiry,sessionDate(now));
  const snapshots=stored.key===storageKey?stored.items:[];
  useEffect(()=>{pruneExpiredPcrStorage();},[]);
  useEffect(()=>{
    const items=loadStoredSnapshots(storageKey).filter(s=>s.source === "exchange" && !s.isSyntheticAnchor && sessionDate(s.ts)===sessionDate(now));
    loadedKey.current=storageKey;
    setStored({key:storageKey,items});
  },[storageKey]);
  const volPcr=useMemo(()=>isIndex&&fullOI.length?calcVolumePCRFull(fullOI):calcVolumePCR(rows),[isIndex,fullOI,rows]);
  const curve=useMemo(()=>isIndex&&fullOI.length?calcMaxPainCurveFull(fullOI):calcMaxPainCurve(rows),[isIndex,fullOI,rows]);
  useEffect(()=>{
    if(!marketOpen || !isFresh(timestamp,now) || !(underlyingValue>0) || !Number.isFinite(pcr) || loadedKey.current!==storageKey) return;
    const ts=marketTimestamp(timestamp);
    const item={ts,source:"exchange",time:formatIstTime(ts),spot:underlyingValue,pcr,volPcr,maxPain,atm,
      totalCeOi:isIndex&&fullOI.length?sumMetric(fullOI,r=>r.c):sumMetric(rows,r=>r.CE?.openInterest),
      totalPeOi:isIndex&&fullOI.length?sumMetric(fullOI,r=>r.p):sumMetric(rows,r=>r.PE?.openInterest)};
    setStored(old=>{
      const items=old.key===storageKey?old.items:[];
      if(items.at(-1)?.ts>=ts) return old;
      const next=[...items,item].slice(-MAX_STORED_SNAPSHOTS);
      saveStoredSnapshots(storageKey,next);
      return {key:storageKey,items:next};
    });
  },[timestamp,now,marketOpen,underlyingValue,pcr,volPcr,maxPain,atm,isIndex,fullOI,rows,storageKey]);
  // A chart anchor may improve axes, but must never be fed into analytical history.
  const displaySnapshots=useMemo(()=>snapshots.length===1 ? [{...snapshots[0],ts:snapshots[0].ts-900000,
    time:formatIstTime(snapshots[0].ts-900000),isSyntheticAnchor:true},snapshots[0]] : snapshots,[snapshots]);
  const fresh=marketOpen&&isFresh(timestamp,now);
  const trendMetrics=useMemo(()=>analyzePcrTrend(fresh?snapshots:[],underlyingValue,maxPain),[fresh,snapshots,underlyingValue,maxPain]);
  const clearHistory=useCallback(()=>{window.localStorage?.removeItem(storageKey);setStored({key:storageKey,items:[]});},[storageKey]);
  return {snapshots:displaySnapshots,rawSnapshotsCount:snapshots.length,trendMetrics,pcrSentiment:getPcrSentiment(pcr),volPcr,
    maxPainCurve:curve.curve,maxPainCalculated:curve.maxPainStrike,clearHistory};
}
