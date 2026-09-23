// src/lib/market/vixHelpers.js

/**
 * Maps India VIX value piecewise to the gauge track percentage (0-100%)
 * ensuring the needle aligns strictly within the matching regime segment:
 * - Low:      0%  to 25%  (VIX 8 to 12)
 * - Normal:   25% to 50%  (VIX 12 to 16)
 * - Caution:  50% to 75%  (VIX 16 to 22)
 * - Panic:    75% to 100% (VIX 22 to 32)
 *
 * @param {number} val - Numeric India VIX value.
 * @returns {number} Percentage (0 - 100) for needle position.
 */
export function getVixGaugePercent(val) {
  const num = Number(val) || 0;
  if (num <= 8) return 0;
  if (num < 12) return Number((((num - 8) / (12 - 8)) * 25).toFixed(1));
  if (num < 16) return Number((25 + ((num - 12) / (16 - 12)) * 25).toFixed(1));
  if (num < 22) return Number((50 + ((num - 16) / (22 - 16)) * 25).toFixed(1));
  if (num < 32) return Number((75 + ((num - 22) / (32 - 22)) * 25).toFixed(1));
  return 100;
}
