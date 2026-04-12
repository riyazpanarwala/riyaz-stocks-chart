// ═══════════════════════════════════════════════════════════════
// FORMATTING UTILITIES  (pure functions, no side-effects)
// ═══════════════════════════════════════════════════════════════

/**
 * Format a large number with K / L suffix.
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function fmtK(n) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (abs >= 1_000)   return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Identical alias used in some sub-modules — kept for API compat.
 * @type {typeof fmtK}
 */
export const fmtN = fmtK;

/**
 * Convert PCR value → plain-English sentiment label.
 * @param {number} pcr
 * @returns {string}
 */
export function pcrLabel(pcr) {
  if (pcr > 1.4) return "Very Bullish";
  if (pcr > 1.2) return "Bullish";
  if (pcr < 0.6) return "Very Bearish";
  if (pcr < 0.8) return "Bearish";
  return "Neutral";
}

/**
 * Convert smart-money bias string → display label.
 * @param {"BULLISH"|"BEARISH"|string} bias
 * @returns {string}
 */
export function biasLabel(bias) {
  if (bias === "BULLISH") return "Market likely to go UP";
  if (bias === "BEARISH") return "Market likely to go DOWN";
  return "Direction unclear — wait & watch";
}

/**
 * Convert ATM-shift label → plain English.
 * @param {"PE Dominant"|"CE Dominant"|string} shift
 * @returns {string}
 */
export function atmShiftLabel(shift) {
  if (shift === "PE Dominant") return "Buyers protecting the downside (Bullish)";
  if (shift === "CE Dominant") return "Sellers capping the upside (Bearish)";
  return "Both sides balanced";
}

/**
 * Convert build-up type → plain English for table cells.
 * @param {string} type
 * @returns {string}
 */
export function buildupLabel(type) {
  const MAP = {
    "Long Build-up":  "Fresh buying",
    "Short Build-up": "Fresh selling",
    "Short Covering": "Sellers exiting (price may rise)",
    "Long Unwinding": "Buyers exiting (price may fall)",
  };
  return MAP[type] ?? type;
}
