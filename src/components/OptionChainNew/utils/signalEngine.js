// ═══════════════════════════════════════════════════════════════
// SIGNAL GENERATION ENGINE  (pure functions)
// Derives the top-level directional signal from option-chain data.
// ═══════════════════════════════════════════════════════════════
import { aggregateActivity, crossedLevel, legActivity, matchedSnapshots, nearestLevels, wallState } from "./analysis.js";
import { pcrLabel } from "./formatters.js";
import { topResistance, topSupport, strikePitch } from "./parsers.js";
import { beforeEntryCutoff, buildPositionPlan, confirmedDirection, expiryIsActive, liquidQuote } from "./tradeRules.js";

/**
 * @typedef {import("./parsers.js").OptionRow} OptionRow
 */

// ─── Helpers ──────────────────────────────────────────────────

/** Map rawSignal → colour-metadata used by the UI. */
export function sigMeta(rawSignal) {
  const MAP = {
    "BUY CALL": { color: "#3fb950", bg: "#0d2a16", icon: "▲" },
    "BUY PUT": { color: "#f85149", bg: "#2a0d0d", icon: "▼" },
    "NO TRADE": { color: "#8b949e", bg: "#1c2128", icon: "—" },
  };
  return MAP[rawSignal] ?? MAP["NO TRADE"];
}

// ─── Main signal function ─────────────────────────────────────

/**
 * Derive a trade signal from the current option chain snapshot.
 *
 * distToRes / distToSup are clamped to finite values before being returned:
 * - When no resistance exists above spot, distToRes is null (rendered as "—").
 * - When no support exists below spot,   distToSup is null (rendered as "—").
 * This prevents "+Infinity" appearing in the UI (FIX #6).
 *
 * @param {OptionRow[]} rows
 * @param {number}      atm    ATM strike price
 * @param {number}      pcr    Put-call ratio
 * @param {number}      spot   Underlying value
 * @returns {{
 *   signal: string, rawSignal: string, strength: number,
 *   strengthLabel: string, pcr: string, pcrBias: string,
 *   oiChangeBias: string, topSupport: number[], topResistance: number[],
 *   distToRes: number|null, distToSup: number|null
 * }}
 */
export function generateSignal(rows, atm, pcr, spot, context = {}) {
  if (!rows || !rows.length) {
    return {
      signal: "WAIT — No clear direction",
      rawSignal: "NO TRADE",
      strength: 0,
      strengthLabel: "Weak",
      pcr: "—",
      pcrBias: "Neutral",
      oiChangeBias: "No data",
      topSupport: [],
      topResistance: [],
      distToRes: null,
      distToSup: null,
    };
  }

  const atmRow = rows.find((r) => r.strikePrice === atm);
  const pitch = strikePitch(rows, spot);

  const resistance = topResistance(rows, spot);
  const support = topSupport(rows, spot);

  const levels = nearestLevels(rows, spot);
  const closestRes = levels.resistance;
  const closestSup = levels.support;

  // FIX #6: use null when no level exists so the UI can render "—" instead of "+Infinity"
  const distToRes = closestRes != null ? closestRes - spot : null;
  const distToSup = closestSup != null ? spot - closestSup : null;

  let bullScore = 0;
  let bearScore = 0;

  // ── Factor 1: Intraday Price-Action Trend from ATM Premiums (25 pts) ──────
  // When Call premiums are expanding and Put premiums decaying, spot is trending up.
  const previousAtm = context.prevRows?.find((r) => r.strikePrice === atm);
  const snapshotsValid = matchedSnapshots(context);
  const activityContext = { ...context, mode: "intraday" };
  const activity = aggregateActivity(rows, atm, pitch, activityContext);
  const atmCeChg = snapshotsValid && previousAtm?.CE?.lastPrice > 0 ? atmRow?.CE?.lastPrice - previousAtm.CE.lastPrice : 0;
  const atmPeChg = snapshotsValid && previousAtm?.PE?.lastPrice > 0 ? atmRow?.PE?.lastPrice - previousAtm.PE.lastPrice : 0;
  const candleBias = confirmedDirection({ candles: context.candles, now: context.now, spot });


  let priceBias = 0;
  if (atmCeChg > 0 && atmPeChg < 0) {
    priceBias = 1;
    bullScore += 25;
  } else if (atmCeChg < 0 && atmPeChg > 0) {
    priceBias = -1;
    bearScore += 25;
  }

  // Positioning is one domain: aggregate the actual classified, normalized amounts.
  const oiChangeBias = activity.bias;
  if (oiChangeBias === 1) bullScore += 25;
  if (oiChangeBias === -1) bearScore += 25;

  // OI PCR is confluence only when both inferred positioning and underlying agree.
  if (Number.isFinite(pcr) && candleBias === priceBias && priceBias === oiChangeBias) {
    if (priceBias === 1 && pcr > 1.25) bullScore += 20;
    if (priceBias === -1 && pcr < 0.8) bearScore += 20;
  }

  // Interval volume is participation, never evidence of trade aggressor direction.
  const participation = activity.volumeAvailable && activity.volumeCE + activity.volumePE > 0;
  if (participation && priceBias === candleBias) {
    if (priceBias === 1) bullScore += 15;
    if (priceBias === -1) bearScore += 15;
  }

  // A breakout crosses a previous barrier in completed underlying candles AND
  // shows aligned inferred covering at that same strike.
  const previousLevels = nearestLevels(context.prevRows, context.prevSpot ?? spot);
  const levelRow = (level) => rows.find(r => r.strikePrice === level);
  const breakout = crossedLevel(context.candles, previousLevels.resistance, 1, context.now, spot) &&
    legActivity(levelRow(previousLevels.resistance), "CE", activityContext).type === "Short Covering";
  const breakdown = crossedLevel(context.candles, previousLevels.support, -1, context.now, spot) &&
    legActivity(levelRow(previousLevels.support), "PE", activityContext).type === "Short Covering";
  if (breakout) bullScore += 15;
  if (breakdown) bearScore += 15;
  // Geometry adds confluence only in the already confirmed direction.
  if (!breakout && !breakdown && distToSup != null && distToRes != null) {
    if (priceBias === 1 && oiChangeBias === 1 && distToSup < distToRes * 0.6) bullScore += 15;
    if (priceBias === -1 && oiChangeBias === -1 && distToRes < distToSup * 0.6) bearScore += 15;
  }

  // ── Signal Decision & Strength ───────────────────────────────────────────
  bullScore = Math.min(100, Math.round(bullScore));
  bearScore = Math.min(100, Math.round(bearScore));
  const netBias = bullScore - bearScore;

  // Disciplined rules: require strong score on the winning side, minimal conflicting evidence
  let rawSignal = "NO TRADE";
  const ready = context.marketOpen === true && beforeEntryCutoff(context.now) && snapshotsValid && Number.isFinite(spot) && spot > 0 &&
    expiryIsActive(atmRow?.CE?.expiryDate, context.now) && expiryIsActive(atmRow?.PE?.expiryDate, context.now);
  if (ready && participation && oiChangeBias === 1 && candleBias === 1 && priceBias === 1 && liquidQuote(atmRow?.CE).valid && bullScore >= 50 && bearScore <= 20 && netBias >= 30) {
    rawSignal = "BUY CALL";
  } else if (ready && participation && oiChangeBias === -1 && candleBias === -1 && priceBias === -1 && liquidQuote(atmRow?.PE).valid && bearScore >= 50 && bullScore <= 20 && netBias <= -30) {
    rawSignal = "BUY PUT";
  }

  const side = rawSignal === "BUY CALL" ? "CE" : rawSignal === "BUY PUT" ? "PE" : null;
  const reversalSignal = rawSignal;
  const contract = side ? { strike: atm, side, expiry: atmRow?.[side]?.expiryDate, ...liquidQuote(atmRow?.[side]) } : null;
  const plan = side ? buildPositionPlan({ side, entryPrice: contract.ask, spot,
    invalidationSpot: side === "CE" ? closestSup : closestRes,
    targetSpot: side === "CE" ? closestRes : closestSup }) : null;
  const reason = !ready ? "Waiting for fresh market snapshots during the session." :
    !candleBias || candleBias !== priceBias ? "Waiting for two completed 5-minute candles and matching premium movement." :
    side && !plan?.eligible ? "Available support/resistance room does not meet 1:1.5 risk/reward." :
    !side ? "Price, OI or executable liquidity does not confirm an entry." : "Entry confirmed; recheck the quote before recording a fill.";
  if (side && !plan?.eligible) rawSignal = "NO TRADE";
  const signal =
    rawSignal === "BUY CALL"
      ? "LIKELY UP — Consider buying a Call"
      : rawSignal === "BUY PUT"
        ? "LIKELY DOWN — Consider buying a Put"
        : "WAIT — No clear direction";

  const strength =
    rawSignal === "BUY CALL"
      ? bullScore
      : rawSignal === "BUY PUT"
        ? bearScore
        : Math.max(0, Math.round(Math.abs(netBias)));

  const strengthLabel =
    strength >= 75 ? "Strong" : strength >= 50 ? "Moderate" : "Weak";

  const oiChangeBiasLabel =
    oiChangeBias === 1
      ? "Inferred bullish positioning"
      : oiChangeBias === -1
        ? "Inferred bearish positioning"
        : "Mixed activity";

  return {
    signal,
    rawSignal,
    strength,
    strengthLabel,
    reason,
    confirmed: reversalSignal !== "NO TRADE",
    reversalSignal,
    contract: rawSignal !== "NO TRADE" ? contract : null,
    tradePlan: rawSignal !== "NO TRADE" ? plan : null,
    pcr: Number.isFinite(pcr) ? pcr.toFixed(2) : "—",
    pcrBias: pcrLabel(pcr),
    oiChangeBias: oiChangeBiasLabel,
    activity,
    nearestSupport: closestSup, nearestResistance: closestRes,
    supportState: wallState(levelRow(closestSup), "PE", activityContext),
    resistanceState: wallState(levelRow(closestRes), "CE", activityContext),
    topSupport: support,
    topResistance: resistance,
    distToRes, // number | null
    distToSup, // number | null
  };
}
