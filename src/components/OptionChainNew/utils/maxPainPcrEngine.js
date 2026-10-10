import { numeric, ratio, sessionDate, sumMetric } from "./analysis.js";
import { pcrLabel } from "./formatters.js";
// ═══════════════════════════════════════════════════════════════
// MAX PAIN & PCR CALCULATION AND TREND ENGINE
// ═══════════════════════════════════════════════════════════════

export const STORAGE_PREFIX = "panarwala_pcr_trend_";
export const MAX_STORED_SNAPSHOTS = 60; // Up to 60 data points (~5KB)
export const MAX_STORED_CONTRACT_KEYS = 8; // Retain at most 8 instruments/expiries
export const MAX_STORAGE_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours TTL

/**
 * Calculates the strike-by-strike loss distribution curve for option sellers (Stock Chain).
 * Loss(S) = Sum_{K < S} (S - K) * CE_OI(K) + Sum_{K > S} (K - S) * PE_OI(K)
 *
 * @param {Array<object>} rows - Array of OptionRow objects
 * @returns {{ maxPainStrike: number, minLoss: number, curve: Array<{strike: number, callLoss: number, putLoss: number, totalLoss: number}> }}
 */
export function calcMaxPainCurve(rows) {
  const ce = sumMetric(rows, r => r.CE?.openInterest), pe = sumMetric(rows, r => r.PE?.openInterest);
  if (ce == null || pe == null || ce + pe === 0) {
    return { maxPainStrike: 0, minLoss: 0, curve: [] };
  }

  let minLoss = Infinity;
  let maxPainStrike = rows[0].strikePrice;

  const curve = rows.map((target) => {
    let callLoss = 0;
    let putLoss = 0;

    for (const r of rows) {
      const ceOi = Number(r.CE?.openInterest) || 0;
      const peOi = Number(r.PE?.openInterest) || 0;

      if (target.strikePrice > r.strikePrice) {
        callLoss += (target.strikePrice - r.strikePrice) * ceOi;
      } else if (target.strikePrice < r.strikePrice) {
        putLoss += (r.strikePrice - target.strikePrice) * peOi;
      }
    }

    const totalLoss = callLoss + putLoss;
    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = target.strikePrice;
    }

    return {
      strike: target.strikePrice,
      callLoss,
      putLoss,
      totalLoss,
    };
  });

  return {
    maxPainStrike,
    minLoss: minLoss === Infinity ? 0 : minLoss,
    curve,
  };
}

/**
 * Calculates the strike-by-strike loss distribution curve for option sellers (Index Chain fullOI).
 *
 * @param {Array<{s: number, c: number, p: number}>} fullOI - Full OI array of strike, call OI, put OI
 * @returns {{ maxPainStrike: number, minLoss: number, curve: Array<{strike: number, callLoss: number, putLoss: number, totalLoss: number}> }}
 */
export function calcMaxPainCurveFull(fullOI) {
  const ce = sumMetric(fullOI, r => r.c), pe = sumMetric(fullOI, r => r.p);
  if (ce == null || pe == null || ce + pe === 0) {
    return { maxPainStrike: 0, minLoss: 0, curve: [] };
  }

  let minLoss = Infinity;
  let maxPainStrike = fullOI[0].s;

  const curve = fullOI.map((target) => {
    let callLoss = 0;
    let putLoss = 0;

    for (const r of fullOI) {
      const ceOi = Number(r.c) || 0;
      const peOi = Number(r.p) || 0;

      if (target.s > r.s) {
        callLoss += (target.s - r.s) * ceOi;
      } else if (target.s < r.s) {
        putLoss += (r.s - target.s) * peOi;
      }
    }

    const totalLoss = callLoss + putLoss;
    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = target.s;
    }

    return {
      strike: target.s,
      callLoss,
      putLoss,
      totalLoss,
    };
  });

  return {
    maxPainStrike,
    minLoss: minLoss === Infinity ? 0 : minLoss,
    curve,
  };
}

/**
 * Calculates volume-based Put-Call Ratio for Stock rows.
 *
 * @param {Array<object>} rows
 * @returns {number}
 */
export function calcVolumePCR(rows) {
  return ratio(sumMetric(rows, r=>r.PE?.totalTradedVolume), sumMetric(rows, r=>r.CE?.totalTradedVolume));
}
export function calcVolumePCRFull(rows) {
  return ratio(sumMetric(rows, r=>r.pVol), sumMetric(rows, r=>r.cVol));
}
export function getPcrSentiment(pcr) {
  if (!Number.isFinite(pcr) || pcr < 0) return {label:"Unavailable",sentiment:"neutral",color:"#8b949e",description:"OI PCR requires valid OI and nonzero Call OI."};
  const label = pcrLabel(pcr);
  return {label,sentiment:"neutral",color:"#e3b341",description:"Relative OI concentration. Direction requires classified OI/premium activity and underlying confirmation."};
}

/**
 * Analyzes intraday trend dynamics across chronological snapshots:
 * - Direction & velocity
 * - Spot vs PCR divergence
 * - Max Pain migration
 * - Gravitational pull to Max Pain
 *
 * @param {Array<{ ts: number, spot: number, pcr: number, maxPain: number, volPcr?: number }>} snapshots
 * @param {number} currentSpot
 * @param {number} currentMaxPain
 * @returns {object}
 */
export function analyzePcrTrend(snapshots, currentSpot = 0, currentMaxPain = 0) {
  const real=(snapshots??[]).filter(s=>!s.isSyntheticAnchor && numeric(s.ts)!=null && Number.isFinite(s.pcr) && s.pcr>=0)
    .sort((a,b)=>a.ts-b.ts).filter((s,i,all)=>i===0 || s.ts!==all[i-1].ts);
  const latest=real.at(-1);
  const history=latest ? real.filter(s=>sessionDate(s.ts)===sessionDate(latest.ts)) : [];
  const first=history[0];
  const empty={direction:"Neutral",velocityPerHour:0,pcrChange:0,divergence:null,maxPainMigration:null,gravityPull:null,historyCount:history.length};
  if(!latest || !first) return empty;
  const spot=currentSpot||latest.spot, maxPain=currentMaxPain||latest.maxPain;
  const gravityPull=spot>0&&maxPain>0 ? {distancePts:Number((spot-maxPain).toFixed(1)),
    distancePct:Number(((spot-maxPain)/maxPain*100).toFixed(2)),targetStrike:maxPain,
    bias:spot>maxPain+5?"Above Max Pain":spot<maxPain-5?"Below Max Pain":"Near Max Pain"} : null;
  if(history.length<2) return {...empty,gravityPull};
  const pcrChange=Number((latest.pcr-first.pcr).toFixed(3));
  const spotChange=Number((latest.spot-first.spot).toFixed(2));
  const spotChangePct=first.spot>0?Number((spotChange/first.spot*100).toFixed(2)):0;
  const hours=(latest.ts-first.ts)/3600000;
  let divergence=null;
  if(Math.abs(spotChangePct)>=0.15 && Math.abs(pcrChange)>=0.03) {
    const priceUp=spotChange>0, pcrUp=pcrChange>0;
    divergence={type:"price_"+(priceUp?"up":"down")+"_pcr_"+(pcrUp?"up":"down"),
      title:priceUp===pcrUp?"Price and PCR moved together":"Price/PCR divergence observed",severity:"info",
      message:"Price changed "+spotChangePct+"% and OI PCR changed "+pcrChange+". Check classified activity before assigning a directional bias."};
  }
  const maxPainMigration=first.maxPain>0&&maxPain>0&&first.maxPain!==maxPain ? {from:first.maxPain,to:maxPain,shift:maxPain-first.maxPain,
    label:"Payout-minimizing strike moved "+first.maxPain+" → "+maxPain,type:"observed_shift"} : null;
  return {direction:pcrChange>=0.04?"Rising":pcrChange<=-0.04?"Falling":"Neutral",pcrChange,spotChange,spotChangePct,
    velocityPerHour:hours>0?Number((pcrChange/hours).toFixed(3)):0,divergence,maxPainMigration,gravityPull,historyCount:history.length};
}

/**
 * Formats a timestamp into an IST display string (HH:mm:ss).
 *
 * @param {number|Date} ts
 * @returns {string}
 */
export function formatIstTime(ts) {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (e) {
    return "--:--";
  }
}

/**
 * Returns today's IST date string in YYYY-MM-DD format.
 *
 * @returns {string}
 */
export function getTodayDateString() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now);
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Generates the standardized storage key for a contract and session date.
 *
 * @param {string} symbol
 * @param {string|null} expiry
 * @param {string} [dateStr]
 * @returns {string}
 */
export function buildStorageKey(symbol, expiry, dateStr = getTodayDateString()) {
  const cleanSymbol = (symbol || "UNKNOWN").toUpperCase().trim();
  const cleanExpiry = (expiry || "CURRENT").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${STORAGE_PREFIX}${cleanSymbol}_${cleanExpiry}_${dateStr}`;
}

/**
 * Loads snapshots from localStorage safely.
 *
 * @param {string} key
 * @returns {Array<object>}
 */
export function loadStoredSnapshots(key) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return [];
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Saves snapshots to localStorage safely with bounds checking.
 *
 * @param {string} key
 * @param {Array<object>} snapshots
 */
export function saveStoredSnapshots(key, snapshots) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const bounded = snapshots.slice(-MAX_STORED_SNAPSHOTS);
    window.localStorage.setItem(key, JSON.stringify(bounded));
  } catch (err) {
    // Silent fail on storage quota exceeded
  }
}

/**
 * Garbage collection: Purges stale option trend entries from localStorage.
 * Automatically deletes:
 * 1. Entries with dates older than maxAgeMs.
 * 2. Excess keys when total saved contracts exceed maxKeys (LRU eviction by key or metadata).
 *
 * @param {object} [options]
 * @param {number} [options.maxAgeMs=MAX_STORAGE_AGE_MS]
 * @param {number} [options.maxKeys=MAX_STORED_CONTRACT_KEYS]
 */
export function pruneExpiredPcrStorage({
  maxAgeMs = MAX_STORAGE_AGE_MS,
  maxKeys = MAX_STORED_CONTRACT_KEYS,
} = {}) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const allKeys = Object.keys(window.localStorage);
    const trendKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
    const now = Date.now();

    const keyMetadata = [];

    for (const k of trendKeys) {
      try {
        const raw = window.localStorage.getItem(k);
        if (!raw) {
          window.localStorage.removeItem(k);
          continue;
        }

        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) {
          window.localStorage.removeItem(k);
          continue;
        }

        const lastTs = data[data.length - 1]?.ts || 0;
        if (lastTs > 0 && now - lastTs > maxAgeMs) {
          // Stale: older than TTL
          window.localStorage.removeItem(k);
          continue;
        }

        keyMetadata.push({ key: k, lastTs });
      } catch (e) {
        window.localStorage.removeItem(k);
      }
    }

    // If still exceeds maxKeys, evict the oldest ones (LRU)
    if (keyMetadata.length > maxKeys) {
      keyMetadata.sort((a, b) => a.lastTs - b.lastTs);
      const toRemoveCount = keyMetadata.length - maxKeys;
      for (let i = 0; i < toRemoveCount; i++) {
        window.localStorage.removeItem(keyMetadata[i].key);
      }
    }
  } catch (err) {
    // Best effort cleanup
  }
}
