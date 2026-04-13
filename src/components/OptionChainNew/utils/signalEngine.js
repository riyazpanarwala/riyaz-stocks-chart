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
    "BUY PUT":  { color: "#f85149", bg: "#2a0d0d", icon: "▼" },
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
  const atmRow = rows.find((r) => r.strikePrice === atm) ?? rows[0];
  const pitch  = strikePitch(rows);

  const resistance = topResistance(rows, spot);
  const support    = topSupport(rows, spot);

  const closestRes = resistance.length ? Math.min(...resistance) : null;
  const closestSup = support.length    ? Math.max(...support)    : null;

  // FIX #6: use null when no level exists so the UI can render "—" instead
  // of "+Infinity".  All downstream comparisons guard for null explicitly.
  const distToRes = closestRes != null ? closestRes - spot : null;
  const distToSup = closestSup != null ? spot - closestSup : null;

  // ── Factor 1: Zone proximity ───────────────────────────────
  // When one side is missing, treat as neutral (0) so the signal doesn't
  // incorrectly skew based on a one-sided market.
  const zoneBias =
    distToSup != null && distToRes != null
      ? distToSup < distToRes ? 1 : -1
      : 0;
  const zoneScore = 30;

  // ── Factor 2: PCR sentiment ────────────────────────────────
  // +Infinity (CE OI = 0, PE > 0) is correctly > 1.2 in JS; NaN → neutral.
  const pcrBias  = pcr > 1.2 ? 1 : Number.isFinite(pcr) && pcr < 0.8 ? -1 : 0;
  const pcrScore = 20;

  // ── Factor 3: OI change at ATM ────────────────────────────
  const ceΔ         = atmRow?.CE.changeinOpenInterest ?? 0;
  const peΔ         = atmRow?.PE.changeinOpenInterest ?? 0;
  const oiChangeBias = peΔ > 0 && ceΔ < 0 ? 1 : ceΔ > 0 && peΔ < 0 ? -1 : 0;
  const oiChangeScore = oiChangeBias !== 0 ? 25 : 10;

  // ── Factor 4: Volume at ATM ───────────────────────────────
  const ceVol  = atmRow?.CE.totalTradedVolume ?? 0;
  const peVol  = atmRow?.PE.totalTradedVolume ?? 0;
  const volBias  = peVol > ceVol * 1.3 ? 1 : ceVol > peVol * 1.3 ? -1 : 0;
  const volScore = volBias !== 0 ? 15 : 7;

  // ── Factor 5: Distance from ATM ──────────────────────────
  const distFromATM = Math.abs(spot - atm);
  const distScore   = distFromATM <= pitch        ? 10
                    : distFromATM <= pitch * 2     ? 7
                    : 4;

  const strength   = Math.min(100, zoneScore + pcrScore + oiChangeScore + volScore + distScore);
  const totalBias  = pcrBias + oiChangeBias + volBias + zoneBias;
  const rawSignal  = strength > 50
    ? totalBias >= 2 ? "BUY CALL" : totalBias <= -2 ? "BUY PUT" : "NO TRADE"
    : "NO TRADE";

  const signal = rawSignal === "BUY CALL" ? "LIKELY UP — Consider buying a Call"
               : rawSignal === "BUY PUT"  ? "LIKELY DOWN — Consider buying a Put"
               : "WAIT — No clear direction";

  const oiChangeBiasLabel = oiChangeBias === 1  ? "New buying activity"
                          : oiChangeBias === -1 ? "New selling activity"
                          : "Mixed activity";

  return {
    signal,
    rawSignal,
    strength: Math.round(strength),
    strengthLabel: strength > 70 ? "Strong" : strength > 50 ? "Moderate" : "Weak",
    pcr: pcr.toFixed(2),
    pcrBias: pcrLabel(pcr),
    oiChangeBias: oiChangeBiasLabel,
    topSupport: support,
    topResistance: resistance,
    distToRes,   // number | null
    distToSup,   // number | null
  };
}
