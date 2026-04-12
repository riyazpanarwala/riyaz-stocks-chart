// ═══════════════════════════════════════════════════════════════
// BREAKOUT DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════
import { THRESHOLDS } from "../constants.js";
import { fmtK } from "./formatters.js";
import { strikePitch } from "./parsers.js";

/**
 * @typedef {import("./parsers.js").OptionRow} OptionRow
 * @typedef {{
 *   rows: OptionRow[], spot: number, atm: number,
 *   pcr: number, ts: number, contractKey?: string
 * }} Snapshot
 */

// ─── Snapshot store ───────────────────────────────────────────

/**
 * Push a new snapshot into the ring buffer (max MAX_SNAPSHOTS entries).
 * Skips pushing if the snapshot is a duplicate of the last one.
 *
 * @param {Snapshot[]} history
 * @param {Snapshot}   snapshot
 * @returns {Snapshot[]}
 */
export function pushSnapshot(history, snapshot) {
  const last = history[history.length - 1];
  if (last) {
    const spotSame = Math.abs(last.spot - snapshot.spot) < 0.01;
    const pcrSame  = Math.abs(last.pcr  - snapshot.pcr)  < 0.001;
    const rowsSame = last.rows.length === snapshot.rows.length &&
      last.rows[0]?.strikePrice === snapshot.rows[0]?.strikePrice &&
      last.rows[last.rows.length - 1]?.strikePrice === snapshot.rows[snapshot.rows.length - 1]?.strikePrice;
    if (spotSame && pcrSame && rowsSame) return history;
  }
  const next = [...history, snapshot];
  if (next.length > THRESHOLDS.MAX_SNAPSHOTS) next.shift();
  return next;
}

// ─── Internal helpers ─────────────────────────────────────────

function arrayAvg(arr, fn) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + fn(x), 0) / arr.length;
}

function nearestATM(rows, spot) {
  if (!rows.length) return null;
  return rows.reduce(
    (b, r) => Math.abs(r.strikePrice - spot) < Math.abs(b.strikePrice - spot) ? r : b,
    rows[0],
  );
}

/** Logarithmic signal strength — prevents extreme outliers dominating. */
function calcStrength(ratio, multiplier = 40, cap = 100) {
  return Math.min(cap, Math.round(Math.log(Math.max(ratio, 1.01)) * multiplier));
}

// ─── Single-snapshot signals ──────────────────────────────────

function atmOIImbalance(rows, spot) {
  const signals = [];
  if (!rows.length) return signals;

  const atm  = nearestATM(rows, spot);
  const ceOI = atm.CE.openInterest || 0;
  const peOI = atm.PE.openInterest || 0;
  if (ceOI === 0 && peOI === 0) return signals;

  const ratio = peOI / (ceOI || 1);
  if (ratio > 2) {
    signals.push({
      id: "ATM_PE_WALL", type: "BULLISH",
      strength: calcStrength(ratio, 35),
      title: "Strong put wall at ATM — floor in place",
      detail: `Put OI at ${atm.strikePrice} is ${ratio.toFixed(1)}× Call OI. Large writers are defending this level, suggesting support.`,
      strike: atm.strikePrice, source: "ATM OI Imbalance",
    });
  } else if (ratio < 0.5) {
    signals.push({
      id: "ATM_CE_WALL", type: "BEARISH",
      strength: calcStrength(1 / ratio, 35),
      title: "Heavy call wall at ATM — ceiling in place",
      detail: `Call OI at ${atm.strikePrice} is ${(1 / ratio).toFixed(1)}× Put OI. Large writers are capping this level.`,
      strike: atm.strikePrice, source: "ATM OI Imbalance",
    });
  }
  return signals;
}

function oiConcentrationBreakout(rows, spot) {
  const signals = [];
  if (rows.length < 5) return signals;

  const totalCE  = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const totalPE  = rows.reduce((s, r) => s + r.PE.openInterest, 0);
  const pitch    = strikePitch(rows);

  const topCE = [...rows].filter((r) => r.strikePrice > spot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest).slice(0, 3);
  const topPE = [...rows].filter((r) => r.strikePrice < spot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest).slice(0, 3);

  if (topCE.length) {
    const nearestCeiling = Math.min(...topCE.map((r) => r.strikePrice));
    const ceilConc   = (topCE.reduce((s, r) => s + r.CE.openInterest, 0) / (totalCE || 1)) * 100;
    const distToCeil = nearestCeiling - spot;
    if (ceilConc > THRESHOLDS.CONCENTRATION_MIN_PCT &&
        distToCeil <= pitch * THRESHOLDS.CONCENTRATION_DISTANCE_MULTIPLIER &&
        distToCeil > 0) {
      signals.push({
        id: "CEILING_BREAKOUT_ZONE", type: "BREAKOUT_WATCH",
        strength: Math.min(100, Math.round(ceilConc)),
        title: `Approaching resistance wall — breakout or rejection at ${nearestCeiling}`,
        detail: `${ceilConc.toFixed(0)}% of all Call OI is concentrated near ${nearestCeiling}. Spot is only ${distToCeil.toFixed(0)} pts away. Watch for a decisive move.`,
        strike: nearestCeiling, source: "OI Concentration",
      });
    }
  }

  if (topPE.length) {
    const nearestFloor = Math.max(...topPE.map((r) => r.strikePrice));
    const floorConc   = (topPE.reduce((s, r) => s + r.PE.openInterest, 0) / (totalPE || 1)) * 100;
    const distToFloor = spot - nearestFloor;
    if (floorConc > THRESHOLDS.CONCENTRATION_MIN_PCT &&
        distToFloor <= pitch * THRESHOLDS.CONCENTRATION_DISTANCE_MULTIPLIER &&
        distToFloor > 0) {
      signals.push({
        id: "FLOOR_BREAKDOWN_ZONE", type: "BREAKDOWN_WATCH",
        strength: Math.min(100, Math.round(floorConc)),
        title: `Approaching support floor — bounce or breakdown at ${nearestFloor}`,
        detail: `${floorConc.toFixed(0)}% of all Put OI is concentrated near ${nearestFloor}. Spot is only ${distToFloor.toFixed(0)} pts away.`,
        strike: nearestFloor, source: "OI Concentration",
      });
    }
  }

  return signals;
}

function pcrExtremeSignal(pcr) {
  const signals = [];
  if (pcr > THRESHOLDS.PCR_EXTREME_HIGH) {
    signals.push({
      id: "PCR_EXTREME_HIGH", type: "BEARISH_REVERSAL_RISK",
      strength: Math.min(100, Math.round((pcr - 1.0) * 50)),
      title: "Extreme put writing — reversal risk (too bullish = contrarian bearish)",
      detail: `PCR is ${pcr.toFixed(2)}, well above 1.5. When everyone writes puts (bets on support), it can snap when stops are triggered.`,
      strike: null, source: "PCR Extreme",
    });
  } else if (pcr < THRESHOLDS.PCR_EXTREME_LOW) {
    signals.push({
      id: "PCR_EXTREME_LOW", type: "BULLISH_REVERSAL_RISK",
      strength: Math.min(100, Math.round((1.0 - pcr) * 50)),
      title: "Extreme call writing — reversal risk (too bearish = contrarian bullish)",
      detail: `PCR is ${pcr.toFixed(2)}, well below 0.5. Heavy call writing often precedes a short-covering rally.`,
      strike: null, source: "PCR Extreme",
    });
  }
  return signals;
}

function maxPainDivergence(spot, maxPain, pitch) {
  const signals = [];
  if (!maxPain || !spot || !pitch) return signals;

  const diff      = spot - maxPain;
  const threshold = pitch * THRESHOLDS.MAX_PAIN_THRESHOLD_MULTIPLIER;

  if (diff > threshold) {
    signals.push({
      id: "MAX_PAIN_ABOVE", type: "MEAN_REVERT_DOWN",
      strength: Math.min(100, Math.round((diff / threshold) * 40)),
      title: `Spot ${diff.toFixed(0)} pts above max pain — downward pull likely near expiry`,
      detail: `Max Pain is at ${maxPain}. Spot at ${spot.toFixed(0)} is stretched above it. Option writers profit most if price drifts back to ${maxPain}.`,
      strike: maxPain, source: "Max Pain Divergence",
    });
  } else if (diff < -threshold) {
    signals.push({
      id: "MAX_PAIN_BELOW", type: "MEAN_REVERT_UP",
      strength: Math.min(100, Math.round((Math.abs(diff) / threshold) * 40)),
      title: `Spot ${Math.abs(diff).toFixed(0)} pts below max pain — upward pull likely near expiry`,
      detail: `Max Pain is at ${maxPain}. Spot at ${spot.toFixed(0)} is stretched below it. Expiry gravity favors a move up to ${maxPain}.`,
      strike: maxPain, source: "Max Pain Divergence",
    });
  }
  return signals;
}

// ─── Diff-based signals ───────────────────────────────────────

function oiUnwindingBreakout(prevRows, currRows, prevSpot, currSpot) {
  const signals = [];
  if (!prevRows?.length || !currRows?.length) return signals;

  const prevMap = Object.fromEntries(prevRows.map((r) => [r.strikePrice, r]));
  const spotRising  = currSpot > prevSpot;
  const spotFalling = currSpot < prevSpot;

  const avgCeDelta = arrayAvg(currRows, (r) => Math.abs(r.CE.changeinOpenInterest));
  const avgPeDelta = arrayAvg(currRows, (r) => Math.abs(r.PE.changeinOpenInterest));

  const aboveSpot = currRows.filter((r) => r.strikePrice > currSpot);
  const belowSpot = currRows.filter((r) => r.strikePrice < currSpot);

  const totalCeUnwind = aboveSpot.reduce((s, r) => {
    const p = prevMap[r.strikePrice];
    if (!p) return s;
    const diff = r.CE.openInterest - p.CE.openInterest;
    return diff < 0 ? s + Math.abs(diff) : s;
  }, 0);

  if (spotRising && aboveSpot.length > 0 &&
      totalCeUnwind > avgCeDelta * aboveSpot.length * THRESHOLDS.UNWIND_THRESHOLD_MULTIPLIER) {
    signals.push({
      id: "CE_UNWIND_BREAKOUT", type: "BULLISH_BREAKOUT",
      strength: Math.min(100, Math.round((totalCeUnwind / (avgCeDelta * aboveSpot.length || 1)) * 30)),
      title: "Call writers exiting as price rises — confirmed breakout signal",
      detail: `${fmtK(totalCeUnwind)} Call OI removed above ${currSpot.toFixed(0)} in last 2 min while spot rose ${(currSpot - prevSpot).toFixed(0)} pts. Resistance is evaporating.`,
      strike: null, source: "OI Unwinding",
    });
  }

  const totalPeUnwind = belowSpot.reduce((s, r) => {
    const p = prevMap[r.strikePrice];
    if (!p) return s;
    const diff = r.PE.openInterest - p.PE.openInterest;
    return diff < 0 ? s + Math.abs(diff) : s;
  }, 0);

  if (spotFalling && belowSpot.length > 0 &&
      totalPeUnwind > avgPeDelta * belowSpot.length * THRESHOLDS.UNWIND_THRESHOLD_MULTIPLIER) {
    signals.push({
      id: "PE_UNWIND_BREAKDOWN", type: "BEARISH_BREAKDOWN",
      strength: Math.min(100, Math.round((totalPeUnwind / (avgPeDelta * belowSpot.length || 1)) * 30)),
      title: "Put writers exiting as price falls — confirmed breakdown signal",
      detail: `${fmtK(totalPeUnwind)} Put OI removed below ${currSpot.toFixed(0)} in last 2 min while spot fell ${Math.abs(currSpot - prevSpot).toFixed(0)} pts. Support is collapsing.`,
      strike: null, source: "OI Unwinding",
    });
  }

  return signals;
}

function suddenOIBuild(prevRows, currRows, spot) {
  const signals = [];
  if (!prevRows?.length || !currRows?.length) return signals;

  const prevMap = Object.fromEntries(prevRows.map((r) => [r.strikePrice, r]));
  const avgCePrev = Math.max(arrayAvg(prevRows, (r) => r.CE.openInterest), THRESHOLDS.AVG_OI_MINIMUM);
  const avgPePrev = Math.max(arrayAvg(prevRows, (r) => r.PE.openInterest), THRESHOLDS.AVG_OI_MINIMUM);

  for (const r of currRows) {
    const p = prevMap[r.strikePrice];
    if (!p) continue;

    const ceGrowth = r.CE.openInterest - p.CE.openInterest;
    const peGrowth = r.PE.openInterest - p.PE.openInterest;

    if (r.strikePrice > spot && ceGrowth > avgCePrev * THRESHOLDS.OI_BUILD_MULTIPLIER && ceGrowth > THRESHOLDS.OI_BUILD_MIN) {
      signals.push({
        id: `CE_WALL_BUILD_${r.strikePrice}`, type: "RESISTANCE_BUILDING",
        strength: Math.min(100, Math.round((ceGrowth / avgCePrev) * 20)),
        title: `New resistance wall rapidly building at ${r.strikePrice}`,
        detail: `+${fmtK(ceGrowth)} Call OI added at ${r.strikePrice} in the last 2 min. Large writers are installing a ceiling here.`,
        strike: r.strikePrice, source: "Sudden OI Build",
      });
    }

    if (r.strikePrice < spot && peGrowth > avgPePrev * THRESHOLDS.OI_BUILD_MULTIPLIER && peGrowth > THRESHOLDS.OI_BUILD_MIN) {
      signals.push({
        id: `PE_FLOOR_BUILD_${r.strikePrice}`, type: "SUPPORT_BUILDING",
        strength: Math.min(100, Math.round((peGrowth / avgPePrev) * 20)),
        title: `New support floor rapidly building at ${r.strikePrice}`,
        detail: `+${fmtK(peGrowth)} Put OI added at ${r.strikePrice} in the last 2 min. Large writers are installing a floor here.`,
        strike: r.strikePrice, source: "Sudden OI Build",
      });
    }
  }

  return signals;
}

function strikeMigration(prevRows, currRows, prevSpot, currSpot) {
  const signals = [];
  if (!prevRows?.length || !currRows?.length) return signals;

  const prevTopCE = [...prevRows].filter((r) => r.strikePrice > prevSpot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)[0];
  const currTopCE = [...currRows].filter((r) => r.strikePrice > currSpot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)[0];

  const prevTopPE = [...prevRows].filter((r) => r.strikePrice < prevSpot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)[0];
  const currTopPE = [...currRows].filter((r) => r.strikePrice < currSpot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)[0];

  if (prevTopCE && currTopCE && currTopCE.strikePrice > prevTopCE.strikePrice)
    signals.push({
      id: "CE_WALL_SHIFTED_UP", type: "BULLISH_BREAKOUT", strength: 70,
      title: `Resistance ceiling shifted UP: ${prevTopCE.strikePrice} → ${currTopCE.strikePrice}`,
      detail: `Bulls forced the call-writing wall higher. This confirms upward breakout momentum — the prior resistance at ${prevTopCE.strikePrice} has been breached.`,
      strike: currTopCE.strikePrice, source: "Strike Migration",
    });

  if (prevTopPE && currTopPE && currTopPE.strikePrice < prevTopPE.strikePrice)
    signals.push({
      id: "PE_FLOOR_SHIFTED_DOWN", type: "BEARISH_BREAKDOWN", strength: 70,
      title: `Support floor shifted DOWN: ${prevTopPE.strikePrice} → ${currTopPE.strikePrice}`,
      detail: `Bears pushed the put-writing floor lower. This confirms downward breakdown momentum — the prior support at ${prevTopPE.strikePrice} has been lost.`,
      strike: currTopPE.strikePrice, source: "Strike Migration",
    });

  return signals;
}

function velocityBreakout(snapshots) {
  const signals = [];
  if (snapshots.length < THRESHOLDS.VELOCITY_SNAPSHOTS) return signals;

  const recent    = snapshots.slice(-THRESHOLDS.VELOCITY_SNAPSHOTS);
  const spotMoves = recent.slice(1).map((s, i) => s.spot - recent[i].spot);
  const avgMove   = spotMoves.reduce((a, b) => a + b, 0) / spotMoves.length;

  const first = recent[0];
  const last  = recent[recent.length - 1];
  if (!first?.rows?.length || !last?.rows?.length) return signals;

  const pitch      = strikePitch(last.rows);
  const totalMove  = last.spot - first.spot;
  const pctOfPitch = Math.abs(totalMove) / pitch;

  if (pctOfPitch <= THRESHOLDS.VELOCITY_MIN_PCT) return signals;

  if (avgMove > 0) {
    const totalPeOI = last.rows.reduce((s, r) => s + r.PE.openInterest, 0);
    const nearPeOI  = last.rows
      .filter((r) => r.strikePrice <= last.spot && r.strikePrice >= last.spot - pitch * 2)
      .reduce((s, r) => s + r.PE.openInterest, 0);

    if (nearPeOI / (totalPeOI || 1) > 0.15)
      signals.push({
        id: "VELOCITY_UP", type: "BULLISH_MOMENTUM",
        strength: Math.min(100, Math.round(pctOfPitch * 35)),
        title: `Upside momentum — spot moved ${totalMove.toFixed(0)} pts in ~4 min with put support`,
        detail: "Consistent upward velocity with put writers defending below. Momentum breakout pattern forming.",
        strike: null, source: "Velocity",
      });
  } else {
    const totalCeOI = last.rows.reduce((s, r) => s + r.CE.openInterest, 0);
    const nearCeOI  = last.rows
      .filter((r) => r.strikePrice >= last.spot && r.strikePrice <= last.spot + pitch * 2)
      .reduce((s, r) => s + r.CE.openInterest, 0);

    if (nearCeOI / (totalCeOI || 1) > 0.15)
      signals.push({
        id: "VELOCITY_DOWN", type: "BEARISH_MOMENTUM",
        strength: Math.min(100, Math.round(pctOfPitch * 35)),
        title: `Downside momentum — spot dropped ${Math.abs(totalMove).toFixed(0)} pts in ~4 min with call resistance`,
        detail: "Consistent downward velocity with call writers overhead. Breakdown momentum pattern forming.",
        strike: null, source: "Velocity",
      });
  }

  return signals;
}

// ─── Master analyzer ─────────────────────────────────────────

/**
 * Main entry point — call on every data refresh.
 *
 * @param {{
 *   rows:      OptionRow[],
 *   prevRows:  OptionRow[],
 *   spot:      number,
 *   prevSpot:  number,
 *   pcr:       number,
 *   maxPain:   number,
 *   snapshots: Snapshot[],
 * }} params
 * @returns {object[]} Sorted breakout signals (strength desc)
 */
export function detectBreakouts({ rows, prevRows, spot, prevSpot, pcr, maxPain, snapshots = [] }) {
  if (!rows?.length || !spot) return [];

  const pitch = strikePitch(rows);

  const allSignals = [
    ...atmOIImbalance(rows, spot),
    ...oiConcentrationBreakout(rows, spot),
    ...pcrExtremeSignal(pcr),
    ...maxPainDivergence(spot, maxPain, pitch),
    ...oiUnwindingBreakout(prevRows, rows, prevSpot, spot),
    ...suddenOIBuild(prevRows, rows, spot),
    ...strikeMigration(prevRows, rows, prevSpot, spot),
    ...velocityBreakout(snapshots),
  ];

  // Deduplicate by id, sort by strength desc
  const seen = new Set();
  return allSignals
    .filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .sort((a, b) => b.strength - a.strength);
}

// ─── Signal meta ─────────────────────────────────────────────

const SIGNAL_META_MAP = {
  BULLISH:               { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🟢", label: "Bullish" },
  BEARISH:               { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "🔴", label: "Bearish" },
  BULLISH_BREAKOUT:      { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🚀", label: "Bullish Breakout" },
  BEARISH_BREAKDOWN:     { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "📉", label: "Bearish Breakdown" },
  BULLISH_MOMENTUM:      { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "▲",  label: "Bullish Momentum" },
  BEARISH_MOMENTUM:      { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "▼",  label: "Bearish Momentum" },
  BREAKOUT_WATCH:        { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "👀", label: "Watch Zone" },
  BREAKDOWN_WATCH:       { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚠️", label: "Watch Zone" },
  RESISTANCE_BUILDING:   { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "🧱", label: "Resistance Building" },
  SUPPORT_BUILDING:      { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🛡️", label: "Support Building" },
  MEAN_REVERT_DOWN:      { color: "#c084fc", bg: "#1a0a1a", border: "#c084fc44", icon: "↩",  label: "Pull-back Risk" },
  MEAN_REVERT_UP:        { color: "#c084fc", bg: "#1a0a1a", border: "#c084fc44", icon: "↪",  label: "Recovery Likely" },
  BULLISH_REVERSAL_RISK: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚡", label: "Reversal Risk" },
  BEARISH_REVERSAL_RISK: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚡", label: "Reversal Risk" },
};
const DEFAULT_META = { color: "#8b949e", bg: "#1c2128", border: "#21262d", icon: "◆", label: "" };

/**
 * Get colour / icon metadata for a signal type string.
 * @param {string} type
 * @returns {object}
 */
export function breakoutSignalMeta(type) {
  return SIGNAL_META_MAP[type] ?? { ...DEFAULT_META, label: type };
}
