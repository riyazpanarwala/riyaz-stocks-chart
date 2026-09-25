// ═══════════════════════════════════════════════════════════════
// SIGNAL GENERATION ENGINE  (pure functions)
// Derives the top-level directional signal from option-chain data.
// ═══════════════════════════════════════════════════════════════
import { pcrLabel } from "./formatters.js";
import { topResistance, topSupport, strikePitch } from "./parsers.js";

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
export function generateSignal(rows, atm, pcr, spot) {
  if (!rows || !rows.length) {
    return {
      signal: "WAIT — No clear direction",
      rawSignal: "NO TRADE",
      strength: 0,
      strengthLabel: "Weak",
      pcr: "0.00",
      pcrBias: "Neutral",
      oiChangeBias: "No data",
      topSupport: [],
      topResistance: [],
      distToRes: null,
      distToSup: null,
    };
  }

  const atmRow = rows.find((r) => r.strikePrice === atm) ?? rows[0];
  const pitch = strikePitch(rows);

  const resistance = topResistance(rows, spot);
  const support = topSupport(rows, spot);

  const closestRes = resistance.length ? Math.min(...resistance) : null;
  const closestSup = support.length ? Math.max(...support) : null;

  // FIX #6: use null when no level exists so the UI can render "—" instead of "+Infinity"
  const distToRes = closestRes != null ? closestRes - spot : null;
  const distToSup = closestSup != null ? spot - closestSup : null;

  let bullScore = 0;
  let bearScore = 0;

  // ── Factor 1: Intraday Price-Action Trend from ATM Premiums (25 pts) ──────
  // When Call premiums are expanding and Put premiums decaying, spot is trending up.
  const atmCeChg = atmRow?.CE?.change ?? 0;
  const atmPeChg = atmRow?.PE?.change ?? 0;
  let priceBias = 0;
  if (atmCeChg > 0 && atmPeChg < 0) {
    priceBias = 1;
    bullScore += 25;
  } else if (atmCeChg < 0 && atmPeChg > 0) {
    priceBias = -1;
    bearScore += 25;
  }

  // ── Factor 2: Cluster OI Change around ATM (25 pts) ──────────────────────
  // Evaluate ATM ± 1 pitch cluster instead of a fragile single strike
  const nearRows = rows.filter((r) => Math.abs(r.strikePrice - atm) <= pitch);
  const nearCeDelta = nearRows.reduce((s, r) => s + (r.CE?.changeinOpenInterest || 0), 0);
  const nearPeDelta = nearRows.reduce((s, r) => s + (r.PE?.changeinOpenInterest || 0), 0);

  // Check Call unwinding above ATM and Put unwinding below ATM
  const callsAbove = rows.filter((r) => r.strikePrice >= atm && r.strikePrice <= atm + pitch * 2);
  const ceUnwindCount = callsAbove.filter((r) => (r.CE?.changeinOpenInterest || 0) < 0).length;
  const putsBelow = rows.filter((r) => r.strikePrice <= atm && r.strikePrice >= atm - pitch * 2);
  const peUnwindCount = putsBelow.filter((r) => (r.PE?.changeinOpenInterest || 0) < 0).length;

  let oiChangeBias = 0;
  if (nearPeDelta > 0 && (nearCeDelta <= 0 || nearPeDelta > nearCeDelta * 1.35 || ceUnwindCount >= 1)) {
    oiChangeBias = 1;
    bullScore += 25;
  } else if (nearCeDelta > 0 && (nearPeDelta <= 0 || nearCeDelta > nearPeDelta * 1.35 || peUnwindCount >= 1)) {
    oiChangeBias = -1;
    bearScore += 25;
  }

  // ── Factor 3: PCR Sentiment (20 pts) ─────────────────────────────────────
  // +Infinity (CE OI = 0, PE > 0) is bullish; NaN/missing is neutral
  let pcrBias = 0;
  if (pcr > 1.25) {
    pcrBias = 1;
    bullScore += 20;
  } else if (Number.isFinite(pcr) && pcr < 0.80) {
    pcrBias = -1;
    bearScore += 20;
  }

  // ── Factor 4: Volume & Liquidity Confirmation (15 pts) ───────────────────
  // Volume must support the price trend or dominant OI side
  const nearCeVol = nearRows.reduce((s, r) => s + (r.CE?.totalTradedVolume || 0), 0);
  const nearPeVol = nearRows.reduce((s, r) => s + (r.PE?.totalTradedVolume || 0), 0);

  if (priceBias === 1 && nearCeVol >= nearPeVol * 0.85) {
    bullScore += 15;
  } else if (priceBias === -1 && nearPeVol >= nearCeVol * 0.85) {
    bearScore += 15;
  } else if (priceBias === 0) {
    if (oiChangeBias === 1 && nearPeVol > nearCeVol * 1.25) {
      bullScore += 15;
    } else if (oiChangeBias === -1 && nearCeVol > nearPeVol * 1.25) {
      bearScore += 15;
    }
  }

  // ── Factor 5: S/R Zone Breakout vs Rejection (15 pts) ────────────────────
  if (distToRes != null && distToRes <= pitch * 0.5) {
    // Testing resistance: check if breaking out with call unwinding or rejecting
    if (priceBias === 1 && (ceUnwindCount >= 1 || nearCeDelta <= 0)) {
      bullScore += 15; // Breakout in progress
    } else if (nearCeDelta > 0) {
      bearScore += 15; // Rejection wall holding
    }
  } else if (distToSup != null && distToSup <= pitch * 0.5) {
    // Testing support: check if breaking down with put unwinding or holding
    if (priceBias === -1 && (peUnwindCount >= 1 || nearPeDelta <= 0)) {
      bearScore += 15; // Breakdown in progress
    } else if (nearPeDelta > 0) {
      bullScore += 15; // Support floor holding
    }
  } else if (distToSup != null && distToRes != null) {
    // Between zones: reward favorable risk-reward room to run
    if (distToSup < distToRes * 0.6) {
      bullScore += 15;
    } else if (distToRes < distToSup * 0.6) {
      bearScore += 15;
    }
  }

  // ── Signal Decision & Strength ───────────────────────────────────────────
  bullScore = Math.min(100, Math.round(bullScore));
  bearScore = Math.min(100, Math.round(bearScore));
  const netBias = bullScore - bearScore;

  // Disciplined rules: require strong score on the winning side, minimal conflicting evidence
  let rawSignal = "NO TRADE";
  if (bullScore >= 50 && bearScore <= 20 && netBias >= 30) {
    rawSignal = "BUY CALL";
  } else if (bearScore >= 50 && bullScore <= 20 && netBias <= -30) {
    rawSignal = "BUY PUT";
  }

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
      ? "Put writing / Bullish support"
      : oiChangeBias === -1
        ? "Call writing / Bearish resistance"
        : "Mixed activity";

  return {
    signal,
    rawSignal,
    strength,
    strengthLabel,
    pcr: Number.isFinite(pcr) ? pcr.toFixed(2) : "—",
    pcrBias: pcrLabel(pcr),
    oiChangeBias: oiChangeBiasLabel,
    topSupport: support,
    topResistance: resistance,
    distToRes, // number | null
    distToSup, // number | null
  };
}
