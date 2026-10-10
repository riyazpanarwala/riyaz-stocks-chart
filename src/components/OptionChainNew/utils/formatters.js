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
 * Describe relative OI concentration, without inferring trade direction.
 * Missing or undefined ratios remain unavailable.
 *
 * @param {number} pcr
 * @returns {string}
 */
export function pcrLabel(pcr) {
  if (!Number.isFinite(pcr) || pcr < 0) return "Unavailable";
  if (pcr > 1.4) return "High Put OI";
  if (pcr > 1.2) return "Put OI dominant";
  if (pcr < 0.6) return "High Call OI";
  if (pcr < 0.8) return "Call OI dominant";
  return "Balanced OI";
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
  if (shift === "PE Dominant") return "Inferred bullish positioning";
  if (shift === "CE Dominant") return "Inferred bearish positioning";
  return "Both sides balanced";
}

/**
 * Convert build-up type → plain English for table cells.
 * @param {string} type
 * @returns {string}
 */
export function buildupLabel(type) {
  const MAP = {
    "Long Build-up":  "Inferred long buildup",
    "Short Build-up": "Inferred short buildup",
    "Short Covering": "Inferred short covering",
    "Long Unwinding": "Buyers exiting (Momentum fading)",
    "No Change":      "No activity",
  };
  return MAP[type] ?? type;
}
