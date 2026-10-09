// ═══════════════════════════════════════════════════════════════
// PARSERS & DATA TRANSFORMATIONS
// Pure functions — no React, no side-effects.
// ═══════════════════════════════════════════════════════════════
import { classifyChange, numeric, ratio, sumMetric } from "./analysis.js";
import { EMPTY_OPTION_LEG } from "../constants.js";

// ─── Types (JSDoc) ────────────────────────────────────────────
/**
 * @typedef {{ openInterest:number, changeinOpenInterest:number,
 *             totalTradedVolume:number, lastPrice:number, change:number }} OptionLeg
 * @typedef {{ strikePrice:number, CE:OptionLeg, PE:OptionLeg }} OptionRow
 * @typedef {{ s:number, c:number, p:number }} FullOIRecord
 */

// ─── Helpers ──────────────────────────────────────────────────

/** Extract a safe OptionLeg from a raw CE/PE object. */
function safeLeg(raw) {
  if (!raw) return { ...EMPTY_OPTION_LEG, available: false };
  const result = { available: true, expiryDate: raw.expiryDate ?? "",
    bidprice: numeric(raw.bidprice ?? raw.bid ?? raw.buyPrice1),
    askPrice: numeric(raw.askPrice ?? raw.ask ?? raw.sellPrice1) };
  for (const key of ["openInterest", "changeinOpenInterest", "totalTradedVolume", "lastPrice", "change", "impliedVolatility"])
    result[key] = numeric(raw[key]);
  return result;
}

// ─── Index chain ──────────────────────────────────────────────

/**
 * Parse the NSE index option-chain response into normalised OptionRow[].
 * @param {object|null} records  Raw API payload (records / displayData / data)
 * @returns {OptionRow[]}
 */
export function parseIndexChain(records) {
  if (!records) return [];

  // Detect stock-shaped data and bail early
  const src = records.fullData ?? records.displayData ?? records.data ?? [];
  if (!Array.isArray(src) || src[0]?.optionType !== undefined) return [];

  return src
    .filter((r) => (r.CE || r.PE) && numeric(r.strikePrice) > 0)
    .map((r) => ({
      strikePrice: numeric(r.strikePrice),
      CE: safeLeg(r.CE),
      PE: safeLeg(r.PE),
    }))
    .sort((a, b) => a.strikePrice - b.strikePrice);
}

// ─── NSE expiry date parser ───────────────────────────────────

/**
 * Parse an NSE-style expiry string ("DD-MMM-YYYY") into a UTC timestamp.
 * ECMAScript only guarantees ISO 8601 parsing; "24-Apr-2026" is
 * implementation-dependent and fails in some non-V8 environments.
 *
 * Returns Number.POSITIVE_INFINITY for unrecognised strings so they sort last.
 *
 * @param {string} value
 * @returns {number}
 */
export function parseNSEExpiry(value) {
  const NSE_MONTHS = {
    Jan: 0, Feb: 1, Mar: 2,  Apr: 3,  May: 4,  Jun: 5,
    Jul: 6, Aug: 7, Sep: 8,  Oct: 9,  Nov: 10, Dec: 11,
  };
  const match = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(value ?? "");
  if (!match) return Number.POSITIVE_INFINITY;
  const month = NSE_MONTHS[match[2]];
  if (month === undefined) return Number.POSITIVE_INFINITY;
  return Date.UTC(Number(match[3]), month, Number(match[1]));
}

// ─── Stock chain ──────────────────────────────────────────────

/**
 * Parse the NSE stock option-chain response for a given expiry.
 * @param {object|null} data
 * @param {string|null}  expiry  Selected expiry date string
 * @returns {{ rows:OptionRow[], expiries:string[], selectedExpiry:string|null }}
 */
export function parseStockChain(data, expiry) {
  const EMPTY = { rows: [], expiries: [], selectedExpiry: null };

  if (!data?.data || !Array.isArray(data.data)) return EMPTY;
  if (data.data[0]?.optionType === undefined) return EMPTY;       // index shape

  const expiries = [
    ...new Set(
      data.data
        .filter((r) => r.optionType !== "XX")
        .map((r) => r.expiryDate),
    ),
  ].sort((a, b) => parseNSEExpiry(a) - parseNSEExpiry(b));

  // Validate: only accept the caller-supplied expiry if it actually exists in
  // this payload. Stale/cached expiry strings from a previous instrument would
  // otherwise leave `filtered` empty while the UI shows a valid-looking chain.
  const sel = (expiry && expiries.includes(expiry)) ? expiry : expiries[0] ?? null;
  if (!sel) return EMPTY;

  const filtered = data.data.filter(
    (r) => r.expiryDate === sel && r.optionType !== "XX",
  );

  /** @type {Record<number, OptionLeg>} */
  const ceMap = {};
  /** @type {Record<number, OptionLeg>} */
  const peMap = {};

  for (const r of filtered) {
    const sp = typeof r.strikePrice === "string"
      ? parseFloat(r.strikePrice)
      : r.strikePrice;
    if (!Number.isFinite(sp) || sp === 0) continue;
    const leg = safeLeg(r);
    if (r.optionType === "CE") ceMap[sp] = leg;
    else if (r.optionType === "PE") peMap[sp] = leg;
  }

  const strikes = [
    ...new Set([...Object.keys(ceMap), ...Object.keys(peMap)]),
  ]
    .map(Number)
    .sort((a, b) => a - b);

  const rows = strikes.map((sp) => ({
    strikePrice: sp,
    CE: ceMap[sp] ?? { ...EMPTY_OPTION_LEG, available: false },
    PE: peMap[sp] ?? { ...EMPTY_OPTION_LEG, available: false },
  }));

  return { rows, expiries, selectedExpiry: sel };
}

// ─── PCR ──────────────────────────────────────────────────────

/**
 * Compute PCR from full-OI array (index path).
 * @param {FullOIRecord[]} fullOI
 * @returns {number}
 */
export function calcPCRFull(fullOI) {
  return ratio(sumMetric(fullOI, r => r.p), sumMetric(fullOI, r => r.c));
}
export function calcPCR(rows) {
  return ratio(sumMetric(rows, r => r.PE?.openInterest), sumMetric(rows, r => r.CE?.openInterest));
}

// ─── Max Pain ─────────────────────────────────────────────────

/**
 * Compute max-pain strike from full-OI array.
 * @param {FullOIRecord[]} fullOI
 * @returns {number}
 */
export function calcMaxPainFull(fullOI) {
  const ce = sumMetric(fullOI, r => r.c), pe = sumMetric(fullOI, r => r.p);
  if (ce == null || pe == null || ce + pe === 0) return 0;
  let minLoss = Infinity;
  let maxPainStrike = fullOI[0].s;

  for (const target of fullOI) {
    let loss = 0;
    for (const r of fullOI) {
      if (target.s > r.s) loss += (target.s - r.s) * r.c;
      if (target.s < r.s) loss += (r.s - target.s) * r.p;
    }
    if (loss < minLoss) { minLoss = loss; maxPainStrike = Number(target.s); }
  }
  return maxPainStrike;
}

/**
 * Compute max-pain strike from OptionRow[].
 * @param {OptionRow[]} rows
 * @returns {number}
 */
export function calcMaxPain(rows) {
  const ce = sumMetric(rows, r => r.CE?.openInterest), pe = sumMetric(rows, r => r.PE?.openInterest);
  if (ce == null || pe == null || ce + pe === 0) return 0;
  let minLoss = Infinity;
  let maxPainStrike = rows[0].strikePrice;

  for (const target of rows) {
    let loss = 0;
    for (const r of rows) {
      if (target.strikePrice > r.strikePrice)
        loss += (target.strikePrice - r.strikePrice) * r.CE.openInterest;
      if (target.strikePrice < r.strikePrice)
        loss += (r.strikePrice - target.strikePrice) * r.PE.openInterest;
    }
    if (loss < minLoss) { minLoss = loss; maxPainStrike = target.strikePrice; }
  }
  return maxPainStrike;
}

// ─── Nearest ATM ──────────────────────────────────────────────

/**
 * Return the strike closest to the underlying value.
 * @param {OptionRow[]} rows
 * @param {number}      uv   Underlying value
 * @returns {number}
 */
export function findATM(rows, uv) {
  if (!rows.length) return 0;
  return rows.reduce(
    (best, r) =>
      Math.abs(r.strikePrice - uv) < Math.abs(best.strikePrice - uv) ? r : best,
    rows[0],
  ).strikePrice;
}

// ─── Build-up classification ───────────────────────────────────

/**
 * Classify OI + price-change combination for a single option leg.
 *
 * Both changes must exceed their noise thresholds. A flat or missing input
 * cannot establish one of the four inferred quadrants.
 *
 * @param {OptionRow} row
 * @param {"CE"|"PE"} side
 * @returns {"Long Build-up"|"Short Build-up"|"Short Covering"|"Long Unwinding"|"No Change"}
 */
export function buildupType(row, side = "CE", thresholds = {}) {
  if (row?.[side]?.available === false) return "Unavailable";
  return classifyChange(row?.[side]?.change, row?.[side]?.changeinOpenInterest, thresholds);
}

// ─── Support / Resistance ─────────────────────────────────────

/**
 * Top-N resistance strikes above spot (sorted by CE OI desc).
 * @param {OptionRow[]} rows
 * @param {number}      spot
 * @param {number}      [n=3]
 * @returns {number[]}
 */
export function topResistance(rows, spot, n = 3) {
  return [...rows]
    .filter((r) => r.strikePrice > spot && r.CE?.openInterest > 0)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)
    .slice(0, n)
    .map((r) => r.strikePrice);
}

/**
 * Top-N support strikes below spot (sorted by PE OI desc).
 * @param {OptionRow[]} rows
 * @param {number}      spot
 * @param {number}      [n=3]
 * @returns {number[]}
 */
export function topSupport(rows, spot, n = 3) {
  return [...rows]
    .filter((r) => r.strikePrice < spot && r.PE?.openInterest > 0)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)
    .slice(0, n)
    .map((r) => r.strikePrice);
}

// ─── Strike pitch ─────────────────────────────────────────────

/**
 * Median of the nearest positive strike gaps, ignoring duplicates.
 * Falls back to 50 if fewer than 2 rows are present.
 * @param {OptionRow[]} rows
 * @returns {number}
 */
export function strikePitch(rows, spot) {
  const strikes = [...new Set((rows ?? []).map(r => numeric(r.strikePrice)).filter(v => v > 0))].sort((a,b) => a-b);
  if (strikes.length < 2) return 50;
  const center = spot ?? strikes[Math.floor(strikes.length / 2)];
  const gaps = strikes.slice(1).map((strike, i) => ({ gap: strike - strikes[i], distance: Math.abs((strike + strikes[i]) / 2 - center) }))
    .sort((a,b) => a.distance-b.distance).slice(0,5).map(v => v.gap).sort((a,b) => a-b);
  const mid = Math.floor(gaps.length/2);
  return gaps.length % 2 ? gaps[mid] : (gaps[mid-1]+gaps[mid])/2;
}
