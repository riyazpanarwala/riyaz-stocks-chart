// ═══════════════════════════════════════════════════════════════
// BREAKOUT DETECTION ENGINE
// Works on initial page load and on every 2-min refresh.
// Designed to be imported into OptionChainNew/index.jsx
// ═══════════════════════════════════════════════════════════════

// ── 1. SNAPSHOT STORE ────────────────────────────────────────
// Keeps the last N snapshots in memory (survives re-renders via ref).
// On page load we have only 1 snapshot → breakout signals are derived
// from single-snapshot heuristics. Once 2+ snapshots exist the diff-
// based signals fire too.

export const MAX_SNAPSHOTS = 10; // ~20 min of history when market is open

/**
 * Push a new snapshot into the ring buffer.
 * @param {Array}  history  - existing snapshots array (from useRef)
 * @param {Object} snapshot - { rows, spot, atm, pcr, ts }
 * @returns {Array} updated history (max MAX_SNAPSHOTS entries)
 */
export function pushSnapshot(history, snapshot) {
  const next = [...history, snapshot];
  if (next.length > MAX_SNAPSHOTS) next.shift();
  return next;
}

// ── 2. HELPER UTILITIES ──────────────────────────────────────

function avg(arr, fn) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + fn(x), 0) / arr.length;
}

function fmtK(n) {
  if (!n && n !== 0) return "—";
  const a = Math.abs(n);
  if (a >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** Nearest strike to spot */
function nearestATM(rows, spot) {
  if (!rows.length) return null;
  return rows.reduce(
    (b, r) =>
      Math.abs(r.strikePrice - spot) < Math.abs(b.strikePrice - spot) ? r : b,
    rows[0],
  );
}

// ── 3. SINGLE-SNAPSHOT BREAKOUT SIGNALS ─────────────────────
// These work immediately on page open with just the current data.

/**
 * OI Imbalance at ATM:
 * If CE OI at ATM >> PE OI → heavy call writing → resistance → bearish wall.
 * If PE OI at ATM >> CE OI → heavy put writing → support floor → bullish bias.
 */
function atmOIImbalance(rows, spot) {
  const signals = [];
  if (!rows.length) return signals;
  const atm = nearestATM(rows, spot);
  const ratio = atm.PE.openInterest / (atm.CE.openInterest || 1);

  if (ratio > 2) {
    signals.push({
      id: "ATM_PE_WALL",
      type: "BULLISH",
      strength: Math.min(100, Math.round(ratio * 25)),
      title: "Strong put wall at ATM — floor in place",
      detail: `Put OI at ${atm.strikePrice} is ${ratio.toFixed(1)}× Call OI. Large writers are defending this level, suggesting support.`,
      strike: atm.strikePrice,
      source: "ATM OI Imbalance",
    });
  } else if (ratio < 0.5) {
    signals.push({
      id: "ATM_CE_WALL",
      type: "BEARISH",
      strength: Math.min(100, Math.round((1 / ratio) * 25)),
      title: "Heavy call wall at ATM — ceiling in place",
      detail: `Call OI at ${atm.strikePrice} is ${(1 / ratio).toFixed(1)}× Put OI. Large writers are capping this level.`,
      strike: atm.strikePrice,
      source: "ATM OI Imbalance",
    });
  }
  return signals;
}

/**
 * OI Concentration Breakout:
 * If the top-3 CE strikes hold >50% of total CE OI, there's a defined ceiling.
 * When spot approaches within 1 strike-gap of that ceiling → potential breakout zone.
 */
function oiConcentrationBreakout(rows, spot) {
  const signals = [];
  if (rows.length < 5) return signals;

  const totalCE = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const totalPE = rows.reduce((s, r) => s + r.PE.openInterest, 0);

  const topCE = [...rows]
    .filter((r) => r.strikePrice > spot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)
    .slice(0, 3);
  const topPE = [...rows]
    .filter((r) => r.strikePrice < spot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)
    .slice(0, 3);

  const strikePitch =
    rows.length > 1
      ? (rows[rows.length - 1].strikePrice - rows[0].strikePrice) /
      (rows.length - 1)
      : 50;

  // Ceiling breakout zone
  if (topCE.length) {
    const nearestCeiling = Math.min(...topCE.map((r) => r.strikePrice));
    const ceilConc = (topCE.reduce((s, r) => s + r.CE.openInterest, 0) / (totalCE || 1)) * 100;
    const distToCeiling = nearestCeiling - spot;

    if (ceilConc > 45 && distToCeiling <= strikePitch * 2 && distToCeiling > 0) {
      signals.push({
        id: "CEILING_BREAKOUT_ZONE",
        type: "BREAKOUT_WATCH",
        strength: Math.min(100, Math.round(ceilConc)),
        title: `Approaching resistance wall — breakout or rejection at ${nearestCeiling}`,
        detail: `${ceilConc.toFixed(0)}% of all Call OI is concentrated near ${nearestCeiling}. Spot is only ${distToCeiling.toFixed(0)} pts away. Watch for a decisive move.`,
        strike: nearestCeiling,
        source: "OI Concentration",
      });
    }
  }

  // Floor breakdown zone
  if (topPE.length) {
    const nearestFloor = Math.max(...topPE.map((r) => r.strikePrice));
    const floorConc = (topPE.reduce((s, r) => s + r.PE.openInterest, 0) / (totalPE || 1)) * 100;
    const distToFloor = spot - nearestFloor;

    if (floorConc > 45 && distToFloor <= strikePitch * 2 && distToFloor > 0) {
      signals.push({
        id: "FLOOR_BREAKDOWN_ZONE",
        type: "BREAKDOWN_WATCH",
        strength: Math.min(100, Math.round(floorConc)),
        title: `Approaching support floor — bounce or breakdown at ${nearestFloor}`,
        detail: `${floorConc.toFixed(0)}% of all Put OI is concentrated near ${nearestFloor}. Spot is only ${distToFloor.toFixed(0)} pts away.`,
        strike: nearestFloor,
        source: "OI Concentration",
      });
    }
  }

  return signals;
}

/**
 * PCR Extreme → Contrarian Breakout Trigger
 * Very high PCR (>1.5) means excessive put writing → market often reverses down.
 * Very low PCR (<0.5) means excessive call writing → market often reverses up.
 */
function pcrExtremeSignal(pcr) {
  const signals = [];
  if (pcr > 1.6) {
    signals.push({
      id: "PCR_EXTREME_HIGH",
      type: "BEARISH_REVERSAL_RISK",
      strength: Math.min(100, Math.round((pcr - 1.0) * 50)),
      title: "Extreme put writing — reversal risk (too bullish = contrarian bearish)",
      detail: `PCR is ${pcr.toFixed(2)}, well above 1.5. When everyone writes puts (bets on support), it can snap when stops are triggered.`,
      strike: null,
      source: "PCR Extreme",
    });
  } else if (pcr < 0.45) {
    signals.push({
      id: "PCR_EXTREME_LOW",
      type: "BULLISH_REVERSAL_RISK",
      strength: Math.min(100, Math.round((1.0 - pcr) * 50)),
      title: "Extreme call writing — reversal risk (too bearish = contrarian bullish)",
      detail: `PCR is ${pcr.toFixed(2)}, well below 0.5. Heavy call writing often precedes a short-covering rally.`,
      strike: null,
      source: "PCR Extreme",
    });
  }
  return signals;
}

/**
 * Max Pain vs Spot divergence:
 * If spot is far above max pain → gravity pull down.
 * If spot is far below max pain → gravity pull up.
 */
function maxPainDivergence(spot, maxPain, strikePitch) {
  const signals = [];
  if (!maxPain || !spot || !strikePitch) return signals;
  const diff = spot - maxPain;
  const threshold = strikePitch * 3;

  if (diff > threshold) {
    signals.push({
      id: "MAX_PAIN_ABOVE",
      type: "MEAN_REVERT_DOWN",
      strength: Math.min(100, Math.round((diff / threshold) * 40)),
      title: `Spot ${diff.toFixed(0)} pts above max pain — downward pull likely near expiry`,
      detail: `Max Pain is at ${maxPain}. Spot at ${spot.toFixed(0)} is stretched above it. Option writers profit most if price drifts back to ${maxPain}.`,
      strike: maxPain,
      source: "Max Pain Divergence",
    });
  } else if (diff < -threshold) {
    signals.push({
      id: "MAX_PAIN_BELOW",
      type: "MEAN_REVERT_UP",
      strength: Math.min(100, Math.round((Math.abs(diff) / threshold) * 40)),
      title: `Spot ${Math.abs(diff).toFixed(0)} pts below max pain — upward pull likely near expiry`,
      detail: `Max Pain is at ${maxPain}. Spot at ${spot.toFixed(0)} is stretched below it. Expiry gravity favors a move up to ${maxPain}.`,
      strike: maxPain,
      source: "Max Pain Divergence",
    });
  }
  return signals;
}

// ── 4. DIFF-BASED BREAKOUT SIGNALS (needs 2+ snapshots) ──────

/**
 * OI Unwinding Breakout:
 * When large CE OI (resistance) is being rapidly CLOSED (negative ΔOI)
 * while spot rises → shorts covering → breakout confirmed.
 * Opposite for support breakdown.
 */
function oiUnwindingBreakout(prevRows, currRows, prevSpot, currSpot) {
  const signals = [];
  if (!prevRows?.length || !currRows?.length) return signals;

  const prevMap = {};
  prevRows.forEach((r) => (prevMap[r.strikePrice] = r));

  const spotRising = currSpot > prevSpot;
  const spotFalling = currSpot < prevSpot;

  const avgCeDelta = avg(currRows, (r) => Math.abs(r.CE.changeinOpenInterest));
  const avgPeDelta = avg(currRows, (r) => Math.abs(r.PE.changeinOpenInterest));

  // Above-spot CE OI being closed while price rises = breakout
  const aboveSpot = currRows.filter((r) => r.strikePrice > currSpot);
  const totalCeUnwind = aboveSpot.reduce((s, r) => {
    const p = prevMap[r.strikePrice];
    if (!p) return s;
    const diff = r.CE.openInterest - p.CE.openInterest;
    return diff < 0 ? s + Math.abs(diff) : s;
  }, 0);

  if (spotRising && aboveSpot.length > 0 && totalCeUnwind > avgCeDelta * aboveSpot.length * 0.5) {
    signals.push({
      id: "CE_UNWIND_BREAKOUT",
      type: "BULLISH_BREAKOUT",
      strength: Math.min(100, Math.round((totalCeUnwind / (avgCeDelta * aboveSpot.length || 1)) * 30)),
      title: "Call writers exiting as price rises — confirmed breakout signal",
      detail: `${fmtK(totalCeUnwind)} Call OI removed above ${currSpot.toFixed(0)} in last 2 min while spot rose ${(currSpot - prevSpot).toFixed(0)} pts. Resistance is evaporating.`,
      strike: null,
      source: "OI Unwinding",
    });
  }

  // Below-spot PE OI being closed while price falls = breakdown
  const belowSpot = currRows.filter((r) => r.strikePrice < currSpot);
  const totalPeUnwind = belowSpot.reduce((s, r) => {
    const p = prevMap[r.strikePrice];
    if (!p) return s;
    const diff = r.PE.openInterest - p.PE.openInterest;
    return diff < 0 ? s + Math.abs(diff) : s;
  }, 0);

  if (spotFalling && totalPeUnwind > avgPeDelta * belowSpot.length * 0.5) {
    signals.push({
      id: "PE_UNWIND_BREAKDOWN",
      type: "BEARISH_BREAKDOWN",
      strength: Math.min(100, Math.round((totalPeUnwind / (avgPeDelta * belowSpot.length)) * 30)),
      title: "Put writers exiting as price falls — confirmed breakdown signal",
      detail: `${fmtK(totalPeUnwind)} Put OI removed below ${currSpot.toFixed(0)} in last 2 min while spot fell ${Math.abs(currSpot - prevSpot).toFixed(0)} pts. Support is collapsing.`,
      strike: null,
      source: "OI Unwinding",
    });
  }

  return signals;
}

/**
 * Rapid OI Build-up at a single strike:
 * A large sudden addition of CE OI at a specific strike above spot = new wall forming.
 * A large sudden addition of PE OI below spot = new floor forming.
 */
function suddenOIBuild(prevRows, currRows, spot) {
  const signals = [];
  if (!prevRows?.length || !currRows?.length) return signals;

  const prevMap = {};
  prevRows.forEach((r) => (prevMap[r.strikePrice] = r));

  const avgCePrev = avg(prevRows, (r) => r.CE.openInterest);
  const avgPePrev = avg(prevRows, (r) => r.PE.openInterest);

  currRows.forEach((r) => {
    const p = prevMap[r.strikePrice];
    if (!p) return;

    const ceGrowth = r.CE.openInterest - p.CE.openInterest;
    const peGrowth = r.PE.openInterest - p.PE.openInterest;

    // New CE wall appearing above spot
    if (r.strikePrice > spot && ceGrowth > avgCePrev * 1.5 && ceGrowth > 5000) {
      signals.push({
        id: `CE_WALL_BUILD_${r.strikePrice}`,
        type: "RESISTANCE_BUILDING",
        strength: Math.min(100, Math.round((ceGrowth / (avgCePrev || 1)) * 20)),
        title: `New resistance wall rapidly building at ${r.strikePrice}`,
        detail: `+${fmtK(ceGrowth)} Call OI added at ${r.strikePrice} in the last 2 min. Large writers are installing a ceiling here.`,
        strike: r.strikePrice,
        source: "Sudden OI Build",
      });
    }

    // New PE floor appearing below spot
    if (r.strikePrice < spot && peGrowth > avgPePrev * 1.5 && peGrowth > 5000) {
      signals.push({
        id: `PE_FLOOR_BUILD_${r.strikePrice}`,
        type: "SUPPORT_BUILDING",
        strength: Math.min(100, Math.round((peGrowth / avgPePrev) * 20)),
        title: `New support floor rapidly building at ${r.strikePrice}`,
        detail: `+${fmtK(peGrowth)} Put OI added at ${r.strikePrice} in the last 2 min. Large writers are installing a floor here.`,
        strike: r.strikePrice,
        source: "Sudden OI Build",
      });
    }
  });

  return signals;
}

/**
 * Strike Migration:
 * Tracks whether the highest-OI CE or PE strike has SHIFTED between snapshots.
 * A shift of the CE wall upward = bulls pushed through → bullish breakout.
 * A shift of the PE floor downward = bears pushed through → bearish breakdown.
 */
function strikeMigration(prevRows, currRows, spot) {
  const signals = [];
  if (!prevRows?.length || !currRows?.length) return signals;

  const prevTopCE = [...prevRows]
    .filter((r) => r.strikePrice > spot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)[0];
  const currTopCE = [...currRows]
    .filter((r) => r.strikePrice > spot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)[0];

  const prevTopPE = [...prevRows]
    .filter((r) => r.strikePrice < spot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)[0];
  const currTopPE = [...currRows]
    .filter((r) => r.strikePrice < spot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)[0];

  if (prevTopCE && currTopCE && currTopCE.strikePrice > prevTopCE.strikePrice) {
    signals.push({
      id: "CE_WALL_SHIFTED_UP",
      type: "BULLISH_BREAKOUT",
      strength: 70,
      title: `Resistance ceiling shifted UP: ${prevTopCE.strikePrice} → ${currTopCE.strikePrice}`,
      detail: `Bulls forced the call-writing wall higher. This confirms upward breakout momentum — the prior resistance at ${prevTopCE.strikePrice} has been breached.`,
      strike: currTopCE.strikePrice,
      source: "Strike Migration",
    });
  }

  if (prevTopPE && currTopPE && currTopPE.strikePrice < prevTopPE.strikePrice) {
    signals.push({
      id: "PE_FLOOR_SHIFTED_DOWN",
      type: "BEARISH_BREAKDOWN",
      strength: 70,
      title: `Support floor shifted DOWN: ${prevTopPE.strikePrice} → ${currTopPE.strikePrice}`,
      detail: `Bears pushed the put-writing floor lower. This confirms downward breakdown momentum — the prior support at ${prevTopPE.strikePrice} has been lost.`,
      strike: currTopPE.strikePrice,
      source: "Strike Migration",
    });
  }

  return signals;
}

/**
 * Velocity Breakout:
 * Measures how fast spot is moving relative to the OI-implied range.
 * If spot moves more than 1 strike-gap in 2 min with rising OI on that side → momentum.
 */
function velocityBreakout(snapshots) {
  const signals = [];
  if (snapshots.length < 3) return signals;

  // Use last 3 snapshots = ~4 min of data
  const recent = snapshots.slice(-3);
  const spotMoves = recent
    .slice(1)
    .map((s, i) => s.spot - recent[i].spot);
  const avgMove = spotMoves.reduce((a, b) => a + b, 0) / spotMoves.length;

  const first = recent[0];
  const last = recent[recent.length - 1];

  if (!first?.rows?.length || !last?.rows?.length) return signals;

  const strikePitch =
    last.rows.length > 1
      ? (last.rows[last.rows.length - 1].strikePrice - last.rows[0].strikePrice) /
      (last.rows.length - 1)
      : 50;

  const totalMove = last.spot - first.spot;
  const pctOfPitch = Math.abs(totalMove) / strikePitch;

  if (pctOfPitch > 0.8 && avgMove > 0) {
    const totalPeOI = last.rows.reduce((s, r) => s + r.PE.openInterest, 0);
    const nearPeOI = last.rows
      .filter((r) => r.strikePrice <= last.spot && r.strikePrice >= last.spot - strikePitch * 2)
      .reduce((s, r) => s + r.PE.openInterest, 0);

    if (nearPeOI / (totalPeOI || 1) > 0.15) {
      signals.push({
        id: "VELOCITY_UP",
        type: "BULLISH_MOMENTUM",
        strength: Math.min(100, Math.round(pctOfPitch * 50)),
        title: `Upside momentum — spot moved ${totalMove.toFixed(0)} pts in ~4 min with put support`,
        detail: `Consistent upward velocity with put writers defending below. Momentum breakout pattern forming.`,
        strike: null,
        source: "Velocity",
      });
    }
  } else if (pctOfPitch > 0.8 && avgMove < 0) {
    const totalCeOI = last.rows.reduce((s, r) => s + r.CE.openInterest, 0);
    const nearCeOI = last.rows
      .filter((r) => r.strikePrice >= last.spot && r.strikePrice <= last.spot + strikePitch * 2)
      .reduce((s, r) => s + r.CE.openInterest, 0);

    if (nearCeOI / (totalCeOI || 1) > 0.15) {
      signals.push({
        id: "VELOCITY_DOWN",
        type: "BEARISH_MOMENTUM",
        strength: Math.min(100, Math.round(pctOfPitch * 50)),
        title: `Downside momentum — spot dropped ${Math.abs(totalMove).toFixed(0)} pts in ~4 min with call resistance`,
        detail: `Consistent downward velocity with call writers overhead. Breakdown momentum pattern forming.`,
        strike: null,
        source: "Velocity",
      });
    }
  }

  return signals;
}

// ── 5. MASTER BREAKOUT ANALYZER ──────────────────────────────

/**
 * Main entry point. Call this on every data refresh and on page load.
 *
 * @param {Object} params
 * @param {Array}  params.rows        - current parsed option chain rows
 * @param {Array}  params.prevRows    - previous rows (can be empty on first load)
 * @param {number} params.spot        - current underlying value
 * @param {number} params.prevSpot    - previous underlying value (0 on first load)
 * @param {number} params.pcr         - current PCR
 * @param {number} params.maxPain     - current max pain strike
 * @param {Array}  params.snapshots   - ring buffer of snapshots (from useRef)
 * @returns {Array} sorted array of breakout signal objects
 */
export function detectBreakouts({ rows, prevRows, spot, prevSpot, pcr, maxPain, snapshots = [] }) {
  if (!rows?.length || !spot) return [];

  const strikePitch =
    rows.length > 1
      ? (rows[rows.length - 1].strikePrice - rows[0].strikePrice) / (rows.length - 1)
      : 50;

  const allSignals = [
    // ── Single-snapshot (works immediately on page open) ──
    ...atmOIImbalance(rows, spot),
    ...oiConcentrationBreakout(rows, spot),
    ...pcrExtremeSignal(pcr),
    ...maxPainDivergence(spot, maxPain, strikePitch),

    // ── Diff-based (needs prevRows from previous 2-min cycle) ──
    ...oiUnwindingBreakout(prevRows, rows, prevSpot, spot),
    ...suddenOIBuild(prevRows, rows, spot),
    ...strikeMigration(prevRows, rows, spot),

    // ── Velocity (needs 3+ snapshots ~4 min) ──
    ...velocityBreakout(snapshots),
  ];

  // Deduplicate by id and sort by strength descending
  const seen = new Set();
  const unique = allSignals.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return unique.sort((a, b) => b.strength - a.strength);
}

// ── 6. SIGNAL META (color / icon) ────────────────────────────

export function breakoutSignalMeta(type) {
  const map = {
    BULLISH: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🟢", label: "Bullish" },
    BEARISH: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "🔴", label: "Bearish" },
    BULLISH_BREAKOUT: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🚀", label: "Bullish Breakout" },
    BEARISH_BREAKDOWN: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "📉", label: "Bearish Breakdown" },
    BULLISH_MOMENTUM: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "▲", label: "Bullish Momentum" },
    BEARISH_MOMENTUM: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "▼", label: "Bearish Momentum" },
    BREAKOUT_WATCH: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "👀", label: "Watch Zone" },
    BREAKDOWN_WATCH: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚠️", label: "Watch Zone" },
    RESISTANCE_BUILDING: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "🧱", label: "Resistance Building" },
    SUPPORT_BUILDING: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🛡️", label: "Support Building" },
    MEAN_REVERT_DOWN: { color: "#c084fc", bg: "#1a0a1a", border: "#c084fc44", icon: "↩", label: "Pull-back Risk" },
    MEAN_REVERT_UP: { color: "#c084fc", bg: "#1a0a1a", border: "#c084fc44", icon: "↪", label: "Recovery Likely" },
    BULLISH_REVERSAL_RISK: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚡", label: "Reversal Risk" },
    BEARISH_REVERSAL_RISK: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚡", label: "Reversal Risk" },
  };
  return map[type] ?? { color: "#8b949e", bg: "#1c2128", border: "#21262d", icon: "◆", label: type };
}
