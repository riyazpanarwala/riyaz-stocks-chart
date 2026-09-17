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
  if (!rows || !rows.length) {
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
  if (!fullOI || !fullOI.length) {
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
  if (!rows || !rows.length) return 0;
  const ceVol = rows.reduce((acc, r) => acc + (Number(r.CE?.totalTradedVolume) || 0), 0);
  const peVol = rows.reduce((acc, r) => acc + (Number(r.PE?.totalTradedVolume) || 0), 0);
  if (ceVol === 0) return peVol === 0 ? 0 : Number.POSITIVE_INFINITY;
  return peVol / ceVol;
}

/**
 * Calculates volume-based Put-Call Ratio for Index fullOI.
 *
 * @param {Array<{cVol?: number, pVol?: number}>} fullOI
 * @returns {number}
 */
export function calcVolumePCRFull(fullOI) {
  if (!fullOI || !fullOI.length) return 0;
  const ceVol = fullOI.reduce((acc, r) => acc + (Number(r.cVol) || 0), 0);
  const peVol = fullOI.reduce((acc, r) => acc + (Number(r.pVol) || 0), 0);
  if (ceVol === 0) return peVol === 0 ? 0 : Number.POSITIVE_INFINITY;
  return peVol / ceVol;
}

/**
 * Evaluates institutional PCR sentiment regime and trading bias.
 *
 * @param {number} pcr
 * @returns {{ label: string, sentiment: "bullish"|"mild_bullish"|"neutral"|"mild_bearish"|"bearish", color: string, description: string }}
 */
export function getPcrSentiment(pcr) {
  const val = Number(pcr) || 0;
  if (val >= 1.45) {
    return {
      label: "Extreme Put Writing",
      sentiment: "bullish",
      color: "#3fb950",
      description: "Aggressive PE writing dominance. High institutional support floor; watch for overbought profit-booking or squeeze if spot corrects.",
    };
  }
  if (val >= 1.15) {
    return {
      label: "Bullish Put Writing",
      sentiment: "mild_bullish",
      color: "#56d364",
      description: "Put writers outweigh call writers. Buyers control the tape with steady support building beneath ATM.",
    };
  }
  if (val >= 0.85) {
    return {
      label: "Neutral / Rangebound",
      sentiment: "neutral",
      color: "#e3b341",
      description: "Balanced equilibrium between Call and Put writers. Expected sideways consolidation within support and resistance boundaries.",
    };
  }
  if (val >= 0.6) {
    return {
      label: "Bearish Call Writing",
      sentiment: "mild_bearish",
      color: "#ff7b72",
      description: "Call writers dominating overhead strikes. Rallies likely to face immediate supply walls.",
    };
  }
  return {
    label: "Extreme Call Writing (Oversold)",
    sentiment: "bearish",
    color: "#f85149",
    description: "Massive CE writing overhead. Market technically oversold; high risk of sharp short-covering bounce if resistance breaks.",
  };
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
  if (!snapshots || snapshots.length === 0) {
    return {
      direction: "Neutral",
      velocityPerHour: 0,
      pcrChange: 0,
      divergence: null,
      maxPainMigration: null,
      gravityPull: null,
      historyCount: 0,
    };
  }

  const first = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  const pcrChange = Number((latest.pcr - first.pcr).toFixed(3));
  const spotChange = Number((latest.spot - first.spot).toFixed(2));
  const spotChangePct = first.spot > 0 ? Number(((spotChange / first.spot) * 100).toFixed(2)) : 0;

  // Velocity per hour
  const timeDiffHours = (latest.ts - first.ts) / (1000 * 60 * 60);
  const velocityPerHour = timeDiffHours > 0.05
    ? Number((pcrChange / timeDiffHours).toFixed(3))
    : 0;

  let direction = "Neutral";
  if (pcrChange >= 0.04) direction = "Rising";
  else if (pcrChange <= -0.04) direction = "Falling";

  // Divergence Detection
  // Bullish Divergence: Spot falling/flat (< -0.1%) but PCR rising (>= +0.03) (Put writers stepping in during dip)
  // Bearish Divergence: Spot rising (>= +0.1%) but PCR falling (<= -0.03) (Call writers capping the rally)
  // Bullish Confirmation: Spot up and PCR up
  // Bearish Confirmation: Spot down and PCR down
  let divergence = null;
  if (spotChangePct <= -0.15 && pcrChange >= 0.03) {
    divergence = {
      type: "bullish_divergence",
      title: "🟢 Bullish Divergence Detected",
      severity: "positive",
      message: `Price dropped ${spotChangePct}% while PCR rose +${pcrChange}. Institutional Put writers are aggressively accumulating contracts into the dip.`,
    };
  } else if (spotChangePct >= 0.15 && pcrChange <= -0.03) {
    divergence = {
      type: "bearish_divergence",
      title: "🔴 Bearish Divergence Detected",
      severity: "warning",
      message: `Price rallied +${spotChangePct}% but PCR fell ${pcrChange}. Call writers are adding heavy resistance overhead, signaling potential exhaustion.`,
    };
  } else if (spotChangePct >= 0.2 && pcrChange >= 0.05) {
    divergence = {
      type: "bullish_confirmation",
      title: "⚡ Strong Bullish Confirmation",
      severity: "info",
      message: `Both price (+${spotChangePct}%) and Put-Call Ratio (+${pcrChange}) are trending higher in tandem.`,
    };
  } else if (spotChangePct <= -0.2 && pcrChange <= -0.05) {
    divergence = {
      type: "bearish_confirmation",
      title: "⚠️ Strong Bearish Confirmation",
      severity: "warning",
      message: `Both price (${spotChangePct}%) and Put-Call Ratio (${pcrChange}) are sliding lower with active call writing.`,
    };
  }

  // Max Pain migration
  let maxPainMigration = null;
  const initialMaxPain = first.maxPain;
  const activeMaxPain = currentMaxPain || latest.maxPain;

  if (initialMaxPain > 0 && activeMaxPain > 0 && initialMaxPain !== activeMaxPain) {
    const shift = activeMaxPain - initialMaxPain;
    maxPainMigration = {
      from: initialMaxPain,
      to: activeMaxPain,
      shift,
      label: shift > 0 ? `Migrated Up (+${shift} pts)` : `Migrated Down (${shift} pts)`,
      type: shift > 0 ? "bullish_shift" : "bearish_shift",
    };
  }

  // Gravitational pull to Max Pain
  let gravityPull = null;
  const spot = currentSpot || latest.spot;
  if (spot > 0 && activeMaxPain > 0) {
    const distancePts = Number((spot - activeMaxPain).toFixed(1));
    const distancePct = Number(((distancePts / activeMaxPain) * 100).toFixed(2));
    let bias = "Neutral";
    if (distancePts > 5) bias = "Downside Gravity (Towards Max Pain)";
    else if (distancePts < -5) bias = "Upside Gravity (Towards Max Pain)";
    else bias = "Pinned at Max Pain";

    gravityPull = {
      distancePts,
      distancePct,
      bias,
      targetStrike: activeMaxPain,
    };
  }

  return {
    direction,
    pcrChange,
    spotChange,
    spotChangePct,
    velocityPerHour,
    divergence,
    maxPainMigration,
    gravityPull,
    historyCount: snapshots.length,
  };
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
