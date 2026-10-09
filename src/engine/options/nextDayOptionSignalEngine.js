// src/engine/options/nextDayOptionSignalEngine.js
// ═══════════════════════════════════════════════════════════════════════════
// NIFTY 3:15 PM IST NEXT-DAY OPTION SIGNAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Pure analytical functions.
// Produces: BUY CE, BUY PE, or NO TRADE based on price-action, OI structure,
// support/resistance, VWAP, PCR, and institutional orderflow.
// ═══════════════════════════════════════════════════════════════════════════

import {
  findATM,
  calcPCRFull,
  topResistance,
  topSupport,
  buildupType,
} from "../../components/OptionChainNew/utils/parsers.js";
import { buildPositionPlan, confirmedDirection, expiryIsActive, isolateExpiry, isFresh, liquidQuote } from "../../components/OptionChainNew/utils/tradeRules.js";

/**
 * Standard NIFTY strike interval
 */
export const NIFTY_STRIKE_STEP = 50;

/**
 * Validates raw option chain data for completeness and integrity.
 * Never fabricate values. If data is incomplete or invalid, returns valid: false.
 *
 * @param {object} payload
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateOptionChainData(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, reason: "Option chain payload is null or not an object." };
  }

  const underlyingValue = Number(payload.underlyingValue);
  if (!Number.isFinite(underlyingValue) || underlyingValue <= 0) {
    return { valid: false, reason: "NIFTY underlying spot price is missing or non-positive." };
  }

  const rows = payload.displayData ?? payload.data ?? [];
  if (!Array.isArray(rows) || rows.length < 3) {
    return { valid: false, reason: "Option chain contains insufficient strike records (< 3 strikes)." };
  }

  // Ensure strikes around ATM have valid CE and PE data
  const atm = Math.round(underlyingValue / NIFTY_STRIKE_STEP) * NIFTY_STRIKE_STEP;
  const atmRow = rows.find((r) => r.strikePrice === atm);
  if (!atmRow || (!atmRow.CE && !atmRow.PE)) {
    return { valid: false, reason: `ATM strike ${atm} lacks valid CE/PE contract data.` };
  }

  return { valid: true };
}

/**
 * Calculates Intraday Volume-Weighted Average Price (VWAP) if candles are available.
 * VWAP = Sum(TypicalPrice * Volume) / Sum(Volume)
 *
 * @param {Array<{ high: number, low: number, close: number, volume: number }>} candles
 * @returns {number|null}
 */
export function calculateVWAP(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  let cumulativeTPV = 0;
  let cumulativeVol = 0;

  for (const c of candles) {
    const vol = Number(c.volume) || 0;
    if (vol <= 0) continue;
    const typicalPrice = (Number(c.high) + Number(c.low) + Number(c.close)) / 3;
    cumulativeTPV += typicalPrice * vol;
    cumulativeVol += vol;
  }

  if (cumulativeVol === 0) return null;
  return Number((cumulativeTPV / cumulativeVol).toFixed(2));
}

/**
 * Classifies NIFTY market structure into:
 * STRONG BULLISH | BULLISH | NEUTRAL | BEARISH | STRONG BEARISH
 *
 * @param {object} params
 * @param {number} params.spot Current NIFTY spot
 * @param {number} params.open Today's open
 * @param {number} params.high Today's high
 * @param {number} params.low Today's low
 * @param {number} params.prevClose Previous session close
 * @param {number|null} params.vwap Intraday VWAP
 * @param {Array<object>} [params.intradayCandles] 5m/15m intraday bars
 * @returns {{ structure: string, rationale: string[], scoreModifier: number }}
 */
export function determineMarketStructure({
  spot,
  open,
  high,
  low,
  prevClose,
  vwap,
  intradayCandles = [],
}) {
  const rationale = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  const dayRange = high - low;
  const dayChangePct = prevClose > 0 ? ((spot - prevClose) / prevClose) * 100 : 0;
  const closePositionInRange = dayRange > 0 ? (spot - low) / dayRange : 0.5;

  // 1. Position relative to Open & Prev Close
  if (spot > open && spot > prevClose) {
    bullishPoints += 2;
    rationale.push(`Spot (₹${spot}) trading above day open (₹${open}) and prev close (₹${prevClose})`);
  } else if (spot < open && spot < prevClose) {
    bearishPoints += 2;
    rationale.push(`Spot (₹${spot}) trading below day open (₹${open}) and prev close (₹${prevClose})`);
  }

  // 2. Closing structure in the day's range
  if (closePositionInRange >= 0.75) {
    bullishPoints += 2;
    rationale.push(`Strong closing structure in upper quartile of day's range (${(closePositionInRange * 100).toFixed(0)}%)`);
  } else if (closePositionInRange <= 0.25) {
    bearishPoints += 2;
    rationale.push(`Weak closing structure in lower quartile of day's range (${(closePositionInRange * 100).toFixed(0)}%)`);
  }

  // 3. VWAP relationship
  if (vwap && Number.isFinite(vwap)) {
    if (spot > vwap) {
      bullishPoints += 2;
      rationale.push(`NIFTY sustaining above intraday VWAP (₹${vwap})`);
    } else if (spot < vwap) {
      bearishPoints += 2;
      rationale.push(`NIFTY trading below intraday VWAP (₹${vwap})`);
    }
  }

  // 4. Intraday Higher-High / Lower-Low trend if 5m/15m bars provided
  if (intradayCandles.length >= 6) {
    const recent = intradayCandles.slice(-6);
    const firstHalf = recent.slice(0, 3);
    const secondHalf = recent.slice(3);

    const firstHigh = Math.max(...firstHalf.map((c) => c.high));
    const firstLow = Math.min(...firstHalf.map((c) => c.low));
    const secondHigh = Math.max(...secondHalf.map((c) => c.high));
    const secondLow = Math.min(...secondHalf.map((c) => c.low));

    if (secondHigh > firstHigh && secondLow > firstLow) {
      bullishPoints += 2;
      rationale.push("Higher highs and higher lows in afternoon session");
    } else if (secondHigh < firstHigh && secondLow < firstLow) {
      bearishPoints += 2;
      rationale.push("Lower highs and lower lows in afternoon session");
    }
  }

  // Overall classification
  const diff = bullishPoints - bearishPoints;
  let structure = "NEUTRAL";
  if (diff >= 5) structure = "STRONG BULLISH";
  else if (diff >= 2) structure = "BULLISH";
  else if (diff <= -5) structure = "STRONG BEARISH";
  else if (diff <= -2) structure = "BEARISH";

  return {
    structure,
    rationale,
    bullishPoints,
    bearishPoints,
    dayChangePct,
  };
}

/**
 * Analyzes strike-level Open Interest behavior and finds primary supports & resistances.
 *
 * @param {Array<object>} rows Full or filtered OptionRow[]
 * @param {number} spot Current spot price
 * @param {number} atm ATM strike
 * @returns {object}
 */
export function analyzeOILevels(rows, spot, atm) {
  if (!rows || !rows.length) {
    return {
      support1: null,
      support2: null,
      resistance1: null,
      resistance2: null,
      highestCeOiStrike: null,
      highestPeOiStrike: null,
      highestCeAddStrike: null,
      highestPeAddStrike: null,
      totalCeOI: 0,
      totalPeOI: 0,
      totalCeChgOI: 0,
      totalPeChgOI: 0,
      pcr: 1.0,
      changeOiPcr: 1.0,
      strikeBehaviors: {},
    };
  }

  let totalCeOI = 0;
  let totalPeOI = 0;
  let totalCeChgOI = 0;
  let totalPeChgOI = 0;

  let maxCeOI = -Infinity;
  let maxPeOI = -Infinity;
  let highestCeOiStrike = null;
  let highestPeOiStrike = null;

  let maxCeAdd = -Infinity;
  let maxPeAdd = -Infinity;
  let highestCeAddStrike = null;
  let highestPeAddStrike = null;

  const strikeBehaviors = {};

  for (const r of rows) {
    const sp = r.strikePrice;
    const ce = r.CE || {};
    const pe = r.PE || {};

    const ceOi = Number(ce.openInterest) || 0;
    const peOi = Number(pe.openInterest) || 0;
    const ceChg = Number(ce.changeinOpenInterest) || 0;
    const peChg = Number(pe.changeinOpenInterest) || 0;

    totalCeOI += ceOi;
    totalPeOI += peOi;
    totalCeChgOI += ceChg;
    totalPeChgOI += peChg;

    if (ceOi > maxCeOI) {
      maxCeOI = ceOi;
      highestCeOiStrike = sp;
    }
    if (peOi > maxPeOI) {
      maxPeOI = peOi;
      highestPeOiStrike = sp;
    }

    if (ceChg > maxCeAdd) {
      maxCeAdd = ceChg;
      highestCeAddStrike = sp;
    }
    if (peChg > maxPeAdd) {
      maxPeAdd = peChg;
      highestPeAddStrike = sp;
    }

    // Classify behaviors
    strikeBehaviors[sp] = {
      CE: buildupType(r, "CE"),
      PE: buildupType(r, "PE"),
    };
  }

  const pcr = totalCeOI > 0 ? Number((totalPeOI / totalCeOI).toFixed(2)) : 1.0;
  const changeOiPcr = totalCeChgOI > 0 ? Number((totalPeChgOI / totalCeChgOI).toFixed(2)) : (totalPeChgOI > 0 ? 3.0 : 1.0);

  // Resistances above spot (sort by highest CE OI + highest CE addition, tie-break closest to spot)
  const callsAboveSpot = rows
    .filter((r) => r.strikePrice > spot)
    .sort((a, b) => {
      const scoreA = (Number(a.CE?.openInterest) || 0) * 0.7 + (Number(a.CE?.changeinOpenInterest) || 0) * 0.3;
      const scoreB = (Number(b.CE?.openInterest) || 0) * 0.7 + (Number(b.CE?.changeinOpenInterest) || 0) * 0.3;
      if (Math.abs(scoreB - scoreA) > 1e-4) return scoreB - scoreA;
      return a.strikePrice - b.strikePrice;
    });

  const resistance1 = callsAboveSpot[0]?.strikePrice ?? null;
  const resistance2 = callsAboveSpot[1]?.strikePrice ?? null;

  // Supports below spot (sort by highest PE OI + highest PE addition, tie-break closest to spot)
  const putsBelowSpot = rows
    .filter((r) => r.strikePrice <= spot)
    .sort((a, b) => {
      const scoreA = (Number(a.PE?.openInterest) || 0) * 0.7 + (Number(a.PE?.changeinOpenInterest) || 0) * 0.3;
      const scoreB = (Number(b.PE?.openInterest) || 0) * 0.7 + (Number(b.PE?.changeinOpenInterest) || 0) * 0.3;
      if (Math.abs(scoreB - scoreA) > 1e-4) return scoreB - scoreA;
      return b.strikePrice - a.strikePrice;
    });

  const support1 = putsBelowSpot[0]?.strikePrice ?? null;
  const support2 = putsBelowSpot[1]?.strikePrice ?? null;

  return {
    support1,
    support2,
    resistance1,
    resistance2,
    highestCeOiStrike,
    highestPeOiStrike,
    highestCeAddStrike,
    highestPeAddStrike,
    totalCeOI,
    totalPeOI,
    totalCeChgOI,
    totalPeChgOI,
    pcr,
    changeOiPcr,
    strikeBehaviors,
  };
}

/**
 * Calculates the 100-point weighted scoring model:
 * Returns score from -100 (Extremely Bearish) to +100 (Extremely Bullish).
 *
 * Bullish factors (+100 max):
 * - Price action: +20
 * - VWAP/market structure: +15
 * - Put OI support: +15
 * - Call OI unwinding: +10
 * - Put writing: +10
 * - PCR/change-PCR: +10
 * - Volume confirmation: +5
 * - IV confirmation: +5
 * - Breakout confirmation: +10
 *
 * Bearish factors (-100 max):
 * - Price action: -20
 * - VWAP/market structure: -15
 * - Call OI resistance: -15
 * - Put OI unwinding: -10
 * - Call writing: -10
 * - PCR/change-PCR: -10
 * - Volume confirmation: -5
 * - IV confirmation: -5
 * - Breakdown confirmation: -10
 *
 * @param {object} inputs
 * @returns {{
 *   bullishScore: number,
 *   bearishScore: number,
 *   finalScore: number,
 *   factorBreakdown: object,
 *   confirmedFactors: { bullish: string[], bearish: string[] }
 * }}
 */
export function calculateWeightedOptionScore({
  spot,
  open,
  high,
  low,
  prevClose,
  vwap,
  marketStructureInfo,
  oiLevels,
  rows,
  atm,
}) {
  let bullPriceAction = 0;
  let bearPriceAction = 0;
  let bullVwapStructure = 0;
  let bearVwapStructure = 0;
  let bullOiSupport = 0;
  let bearOiResistance = 0;
  let bullCallUnwinding = 0;
  let bearPutUnwinding = 0;
  let bullPutWriting = 0;
  let bearCallWriting = 0;
  let bullPcr = 0;
  let bearPcr = 0;
  let bullVolume = 0;
  let bearVolume = 0;
  let bullIv = 0;
  let bearIv = 0;
  let bullBreakout = 0;
  let bearBreakdown = 0;

  const confirmedBullish = [];
  const confirmedBearish = [];

  // 1. Price Action (+/- 20)
  const dayChangePct = prevClose > 0 ? ((spot - prevClose) / prevClose) * 100 : 0;
  const dayRange = high - low;
  const closePct = dayRange > 0 ? (spot - low) / dayRange : 0.5;

  if (dayChangePct >= 0.5 && closePct >= 0.7) {
    bullPriceAction = 20;
    confirmedBullish.push("Price action: Strong day gain (>0.5%) with upper-range close");
  } else if (dayChangePct > 0.15 && closePct >= 0.55) {
    bullPriceAction = 14;
    confirmedBullish.push("Price action: Modest intraday gain with constructive close");
  } else if (dayChangePct <= -0.5 && closePct <= 0.3) {
    bearPriceAction = 20;
    confirmedBearish.push("Price action: Severe day drop (<-0.5%) with lower-range close");
  } else if (dayChangePct < -0.15 && closePct <= 0.45) {
    bearPriceAction = 14;
    confirmedBearish.push("Price action: Modest intraday decline with weak close");
  }

  // 2. VWAP / Market Structure (+/- 15)
  const ms = marketStructureInfo.structure;
  const isAboveVwap = vwap ? spot > vwap : spot > open;
  if (ms === "STRONG BULLISH" && isAboveVwap) {
    bullVwapStructure = 15;
    confirmedBullish.push("Market structure: Strong bullish swing structure sustained above VWAP");
  } else if (ms === "BULLISH" || (ms === "NEUTRAL" && isAboveVwap)) {
    bullVwapStructure = 10;
    confirmedBullish.push("Market structure: Positive slope above benchmark VWAP");
  } else if (ms === "STRONG BEARISH" && !isAboveVwap) {
    bearVwapStructure = 15;
    confirmedBearish.push("Market structure: Strong bearish swing structure suppressed below VWAP");
  } else if (ms === "BEARISH" || (ms === "NEUTRAL" && !isAboveVwap)) {
    bearVwapStructure = 10;
    confirmedBearish.push("Market structure: Negative slope below benchmark VWAP");
  }

  // 3. OI Support / Resistance (+/- 15)
  // Check if ATM / near-ATM strikes have heavy PE OI floor or CE OI ceiling
  const atmRow = rows.find((r) => r.strikePrice === atm) ?? rows[0];
  const atmPeOI = Number(atmRow?.PE?.openInterest) || 0;
  const atmCeOI = Number(atmRow?.CE?.openInterest) || 0;

  if (oiLevels.support1 != null && atmPeOI > 0 && oiLevels.support1 >= atm - 50 && atmPeOI >= atmCeOI) {
    bullOiSupport = 15;
    confirmedBullish.push(`OI Support: Strong Put base anchored at/near ATM (₹${oiLevels.support1})`);
  } else if (oiLevels.support1 != null && atmPeOI > 0 && oiLevels.support1 >= spot - 100) {
    bullOiSupport = 10;
    confirmedBullish.push(`OI Support: Solid Put concentration near spot (₹${oiLevels.support1})`);
  }

  if (oiLevels.resistance1 != null && atmCeOI > 0 && oiLevels.resistance1 <= atm + 50 && atmCeOI >= atmPeOI) {
    bearOiResistance = 15;
    confirmedBearish.push(`OI Resistance: Heavy Call wall overhead at/near ATM (₹${oiLevels.resistance1})`);
  } else if (oiLevels.resistance1 != null && atmCeOI > 0 && oiLevels.resistance1 <= spot + 100) {
    bearOiResistance = 10;
    confirmedBearish.push(`OI Resistance: Heavy Call supply capping spot (₹${oiLevels.resistance1})`);
  }

  // 4. Call OI Unwinding / Put OI Unwinding (+/- 10)
  // Near or above ATM Call unwinding is strongly bullish
  const callsNearAtm = rows.filter((r) => r.strikePrice >= atm && r.strikePrice <= atm + 200);
  const callUnwindingCount = callsNearAtm.filter((r) => Number(r.CE?.changeinOpenInterest) < 0 && Number(r.CE?.change) > 0).length;

  const putsNearAtm = rows.filter((r) => r.strikePrice <= atm && r.strikePrice >= atm - 200);
  const putUnwindingCount = putsNearAtm.filter((r) => Number(r.PE?.changeinOpenInterest) < 0 && Number(r.PE?.change) > 0).length;

  if (callUnwindingCount >= 2) {
    bullCallUnwinding = 10;
    confirmedBullish.push("Call Unwinding: Call writers running for cover above ATM strikes");
  } else if (callUnwindingCount === 1) {
    bullCallUnwinding = 5;
  }

  if (putUnwindingCount >= 2) {
    bearPutUnwinding = 10;
    confirmedBearish.push("Put Unwinding: Put writers panicking and abandoning support below ATM");
  } else if (putUnwindingCount === 1) {
    bearPutUnwinding = 5;
  }

  // 5. Put Writing / Call Writing (+/- 10)
  const peAddNearAtm = putsNearAtm.reduce((acc, r) => acc + (Number(r.PE?.change) < 0 ? Math.max(0, Number(r.PE?.changeinOpenInterest) || 0) : 0), 0);
  const ceAddNearAtm = callsNearAtm.reduce((acc, r) => acc + (Number(r.CE?.change) < 0 ? Math.max(0, Number(r.CE?.changeinOpenInterest) || 0) : 0), 0);

  if (peAddNearAtm > 0 && peAddNearAtm > ceAddNearAtm * 1.5) {
    bullPutWriting = 10;
    confirmedBullish.push("Put Writing: Aggressive institutional PE buildup protecting the downside");
  } else if (peAddNearAtm > 0 && peAddNearAtm > ceAddNearAtm) {
    bullPutWriting = 6;
  }

  if (ceAddNearAtm > 0 && ceAddNearAtm > peAddNearAtm * 1.5) {
    bearCallWriting = 10;
    confirmedBearish.push("Call Writing: Massive CE accumulation suppressing upside expansion");
  } else if (ceAddNearAtm > 0 && ceAddNearAtm > peAddNearAtm) {
    bearCallWriting = 6;
  }

  // 6. PCR / Change-OI PCR (+/- 10)
  const pcr = oiLevels.pcr;
  const dPcr = oiLevels.changeOiPcr;

  if (pcr >= 1.25 && dPcr >= 1.2) {
    bullPcr = 10;
    confirmedBullish.push(`PCR Confluence: Total PCR (${pcr}) & Change-OI PCR (${dPcr}) strongly bullish`);
  } else if (pcr >= 1.1 || dPcr >= 1.15) {
    bullPcr = 6;
  } else if (pcr <= 0.75 && dPcr <= 0.8) {
    bearPcr = 10;
    confirmedBearish.push(`PCR Confluence: Total PCR (${pcr}) & Change-OI PCR (${dPcr}) heavily bearish`);
  } else if (pcr <= 0.85 || dPcr <= 0.85) {
    bearPcr = 6;
  }

  // 7. Volume Confirmation (+/- 5)
  const atmCeVol = Number(atmRow?.CE?.totalTradedVolume) || 0;
  const atmPeVol = Number(atmRow?.PE?.totalTradedVolume) || 0;

  if (atmPeVol > atmCeVol * 1.35) {
    bullVolume = 5;
    confirmedBullish.push("Volume Confirmation: PE trading volume decisively outpaces CE volume");
  } else if (atmCeVol > atmPeVol * 1.35) {
    bearVolume = 5;
    confirmedBearish.push("Volume Confirmation: CE trading volume decisively outpaces PE volume");
  }

  // 8. IV Confirmation (+/- 5)
  // Rising CE IV during upmove or falling PE IV indicates healthy demand
  const ceIv = Number(atmRow?.CE?.impliedVolatility) || 0;
  const peIv = Number(atmRow?.PE?.impliedVolatility) || 0;

  if (dayChangePct > 0 && ceIv > 0 && ceIv >= peIv) {
    bullIv = 5;
    confirmedBullish.push("IV Confirmation: Call implied volatility reflects active buyer bidding");
  } else if (dayChangePct < 0 && peIv > 0 && peIv >= ceIv) {
    bearIv = 5;
    confirmedBearish.push("IV Confirmation: Put implied volatility reflects active downside hedging");
  }

  // 9. Breakout / Breakdown Confirmation (+/- 10)
  if (spot >= high - 25 && oiLevels.resistance1 >= spot) {
    bullBreakout = 10;
    confirmedBullish.push("Breakout Confirmation: Spot testing day highs with momentum into 3:15 PM");
  } else if (spot >= high - 40) {
    bullBreakout = 5;
  }

  if (spot <= low + 25 && oiLevels.support1 <= spot) {
    bearBreakdown = 10;
    confirmedBearish.push("Breakdown Confirmation: Spot testing day lows under persistent selling into 3:15 PM");
  } else if (spot <= low + 40) {
    bearBreakdown = 5;
  }

  const bullishScore = Math.min(
    100,
    bullPriceAction +
      bullVwapStructure +
      bullOiSupport +
      bullCallUnwinding +
      bullPutWriting +
      bullPcr +
      bullVolume +
      bullIv +
      bullBreakout
  );

  const bearishScore = Math.min(
    100,
    bearPriceAction +
      bearVwapStructure +
      bearOiResistance +
      bearPutUnwinding +
      bearCallWriting +
      bearPcr +
      bearVolume +
      bearIv +
      bearBreakdown
  );

  const finalScore = bullishScore - bearishScore;

  return {
    bullishScore,
    bearishScore,
    finalScore,
    factorBreakdown: {
      priceAction: { bull: bullPriceAction, bear: bearPriceAction },
      vwapStructure: { bull: bullVwapStructure, bear: bearVwapStructure },
      oiSupportResistance: { bull: bullOiSupport, bear: bearOiResistance },
      unwinding: { bull: bullCallUnwinding, bear: bearPutUnwinding },
      writing: { bull: bullPutWriting, bear: bearCallWriting },
      pcr: { bull: bullPcr, bear: bearPcr },
      volume: { bull: bullVolume, bear: bearVolume },
      iv: { bull: bullIv, bear: bearIv },
      breakoutBreakdown: { bull: bullBreakout, bear: bearBreakdown },
    },
    confirmedFactors: {
      bullish: confirmedBullish,
      bearish: confirmedBearish,
    },
  };
}

/**
 * Selects the optimal option contract to buy:
 * Prefers:
 * 1. ATM contract
 * 2. One strike ITM contract
 * Evaluates volume, OI, bid-ask spread, and avoids illiquid or far-OTM options.
 *
 * @param {object} params
 * @param {string} params.signal "BUY CE" | "BUY PE"
 * @param {Array<object>} params.rows
 * @param {number} params.atm
 * @param {string} [params.expiry]
 * @returns {object|null}
 */
export function selectOptionToBuy({ signal, rows, atm, expiry = "Current Expiry" }) {
  if (signal === "NO TRADE" || !rows || !rows.length) return null;

  const isCE = signal === "BUY CE";
  const step = NIFTY_STRIKE_STEP;

  // Candidates: 1. ATM, 2. One strike ITM
  // For CE: ATM is `atm`, 1-strike ITM is `atm - step`
  // For PE: ATM is `atm`, 1-strike ITM is `atm + step`
  const atmStrike = atm;
  const itmStrike = isCE ? atm - step : atm + step;

  const atmRow = rows.find((r) => r.strikePrice === atmStrike);
  const itmRow = rows.find((r) => r.strikePrice === itmStrike);

  const candidates = [];

  const inspectLeg = (row, strike, type) => {
    if (!row) return null;
    const leg = isCE ? row.CE : row.PE;
    if (!leg) return null;

    const ltp = Number(leg.lastPrice) || 0;
    const oi = Number(leg.openInterest) || 0;
    const vol = Number(leg.totalTradedVolume) || 0;
    const iv = Number(leg.impliedVolatility) || 0;
    const bid = liquidQuote(leg).bid;
    const ask = liquidQuote(leg).ask;

    if (!liquidQuote(leg).valid || (expiry !== "Current Expiry" && leg.expiryDate !== expiry)) return null;
    const spread = ask - bid;
    const spreadPct = liquidQuote(leg).spreadPct;

    return {
      strike,
      type,
      optionName: `NIFTY ${strike} ${isCE ? "CE" : "PE"}`,
      expiry,
      ltp,
      oi,
      volume: vol,
      iv: iv > 0 ? iv : null,
      bid,
      ask,
      spread,
      spreadPct,
      isAtm: strike === atmStrike,
      isItm: strike === itmStrike,
    };
  };

  const atmOption = inspectLeg(atmRow, atmStrike, "ATM");
  const itmOption = inspectLeg(itmRow, itmStrike, "ITM");

  if (atmOption && atmOption.ltp > 0) candidates.push(atmOption);
  if (itmOption && itmOption.ltp > 0) candidates.push(itmOption);

  if (!candidates.length) return null;

  // Prefer contract with higher volume & tight spread
  candidates.sort((a, b) => {
    // Heavily penalize wide bid-ask spread (> 3%)
    if (a.spreadPct > 3 && b.spreadPct <= 3) return 1;
    if (b.spreadPct > 3 && a.spreadPct <= 3) return -1;
    // Prefer higher volume
    return b.volume - a.volume;
  });

  return candidates[0];
}

/**
 * Calculates next-day entry trigger, option entry zone, stop loss, targets, and risk/reward.
 *
 * @param {object} params
 * @param {number} params.spot
 * @param {string} params.signal "BUY CE" | "BUY PE"
 * @param {number} params.high Today's high
 * @param {number} params.low Today's low
 * @param {object} params.oiLevels
 * @param {object} params.optionSelected
 * @returns {object}
 */
export function calculateNextDayTradeLevels({
  spot,
  signal,
  high,
  low,
  oiLevels,
  optionSelected,
  entryPrice = null,
  liveSpot = null,
  roundTripCost = 0,
}) {
  if (signal === "NO TRADE" || !optionSelected) {
    return {
      entryTrigger: "—",
      entryZone: "—",
      stopLoss: 0,
      target1: 0,
      target2: 0,
      riskRewardRatio: 0,
      underlyingInvalidation: "—",
    };
  }

  const isCE = signal === "BUY CE";
  const premium = optionSelected.ask;

  // Spot entry trigger based on high/low and key levels
  // For CE: NIFTY sustains above (slightly above day high or closest resistance)
  // For PE: NIFTY sustains below (slightly below day low or closest support)
  let triggerSpot = 0;
  let invalidationSpot = 0;

  if (isCE) {
    triggerSpot = Math.max(Math.round(high), Math.round(spot + 20));
    invalidationSpot = oiLevels.support1 != null ? Math.round(oiLevels.support1) : null;
  } else {
    triggerSpot = Math.min(Math.round(low), Math.round(spot - 20));
    invalidationSpot = oiLevels.resistance1 != null ? Math.round(oiLevels.resistance1) : null;
  }

  // Option Premium Calculations
  // Delta approximation: ATM delta ~ 0.50, ITM delta ~ 0.60
  const delta = optionSelected.isItm ? 0.6 : 0.5;

  // Indicative delta projection to the underlying trigger; execution must be requoted.
  const direction = isCE ? 1 : -1;
  const referenceSpot = liveSpot ?? triggerSpot;
  const referencePremium = entryPrice ?? (premium + direction * (triggerSpot - spot) * delta);
  const projectedTarget = triggerSpot + direction * (high - low);
  const barriers = (isCE ? [oiLevels.resistance1, oiLevels.resistance2] : [oiLevels.support1, oiLevels.support2])
    .filter((n) => Number.isFinite(n) && direction * (n - triggerSpot) > 0);
  const targetSpot = barriers.length ? (isCE ? Math.min(projectedTarget, ...barriers) : Math.max(projectedTarget, ...barriers)) : projectedTarget;
  const plan = buildPositionPlan({ side: isCE ? "CE" : "PE", entryPrice: referencePremium, spot: referenceSpot,
    invalidationSpot, targetSpot, target2Spot: targetSpot, delta, roundTripCost });

  // Keep the premium stop aligned with underlying invalidation; reject impossible stops.
  const stopLoss = plan?.stopLoss ?? 0;
  const maxRisk = plan?.maxRisk ?? 0;

  // Targets reflect the measured range capped by observed opposing OI levels.
  const target1 = plan?.target1 ?? 0;
  const target2 = plan?.target2 ?? 0;

  const riskRewardRatio = plan?.riskRewardRatio ?? 0;

  const entryTriggerText = isCE
    ? `NIFTY sustains above ${triggerSpot} for two completed 5-minute candles`
    : `NIFTY sustains below ${triggerSpot} for two completed 5-minute candles`;

  const invalidationText = isCE
    ? `NIFTY slips below ${invalidationSpot}. Enter only after two completed 5-minute closes above ${triggerSpot}.`
    : `NIFTY climbs above ${invalidationSpot}. Enter only after two completed 5-minute closes below ${triggerSpot}.`;

  return {
    triggerSpot,
    invalidationSpot,
    entryTrigger: entryTriggerText,
    entryZone: entryPrice == null ? "Requote after the trigger; no fixed next-day premium entry band." : `Actual fill ₹${entryPrice}`,
    referencePremium,
    targetSpot,
    indicative: entryPrice == null,
    requiresRevalidation: true,
    exitRule: "Sell the held option at stop, target, underlying invalidation, confirmed reversal, or 15:20 IST.",
    stopLoss,
    target1,
    target2,
    maxRisk,
    riskRewardRatio,
    underlyingInvalidation: invalidationText,
  };
}

/**
 * Assesses Confidence Rating: LOW | MEDIUM | HIGH
 * HIGH confidence strictly requires agreement between:
 * - Price action
 * - OI structure
 * - Support / resistance
 * - Volume confirmation
 * - Adequate option liquidity
 *
 * @param {object} params
 * @returns {"LOW" | "MEDIUM" | "HIGH"}
 */
export function determineConfidence({
  finalScore,
  confirmedFactorsList,
  optionContract,
}) {
  const absScore = Math.abs(finalScore);
  const factorCount = confirmedFactorsList.length;

  // Guard against illiquid contracts or insufficient factor agreement
  if (absScore < 60 || factorCount < 3) {
    return "LOW";
  }

  const hasLiquidity = optionContract && optionContract.volume >= 50_000 && optionContract.spreadPct <= 3.0;
  const hasStrongConfirmation = factorCount >= 4 && absScore >= 75 && hasLiquidity;

  if (hasStrongConfirmation) {
    return "HIGH";
  }

  if (absScore >= 60 && factorCount >= 3) {
    return "MEDIUM";
  }

  return "LOW";
}

/**
 * Main Orchestrator:
 * Generates the full 3:15 PM IST Next-Day Option Signal.
 * Robust against missing, delayed, or malformed data.
 *
 * @param {object} data
 * @param {object} data.optionChain Raw or parsed option chain
 * @param {object} data.spotData { spot, open, high, low, prevClose, vwap }
 * @param {Array<object>} [data.intradayCandles]
 * @param {string} [data.analysisDate]
 * @param {string} [data.expiry]
 * @returns {object}
 */
export function generate315NextDayOptionSignal({
  optionChain,
  spotData,
  intradayCandles = [],
  analysisDate = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
  expiry = null,
  requireFreshData = false,
  now = Date.now(),
  analysisTime = "3:15 PM IST",
  marketOpen = true,
}) {
  if (optionChain) {
    const isolated = isolateExpiry(optionChain.displayData ?? optionChain.data ?? [], expiry ?? optionChain.expiry);
    optionChain = { ...optionChain, displayData: isolated.rows, expiry: isolated.expiry };
  }
  // 1. Data Integrity Guard
  const validation = validateOptionChainData(optionChain);
  if (!validation.valid || !spotData || !Number.isFinite(Number(spotData.spot)) || Number(spotData.spot) <= 0) {
    return {
      status: "DATA_UNAVAILABLE",
      signal: "NO TRADE",
      primarySignal: "NO TRADE",
      reason: validation.reason || "Spot price data unavailable.",
      primarySignalText: "NO TRADE — DATA UNAVAILABLE",
      date: analysisDate,
      time: "3:15 PM IST",
      rawScore: 0,
      bullishScore: 0,
      bearishScore: 0,
      finalScore: 0,
      confidence: "LOW",
    };
  }

  const spot = Number(spotData.spot);
  const open = Number(spotData.open) || spot;
  const high = Math.max(Number(spotData.high) || spot, spot);
  const low = Math.min(Number(spotData.low) || spot, spot);
  const prevClose = Number(spotData.prevClose) || spot;
  const vwap = spotData.vwap ?? calculateVWAP(intradayCandles);

  // Normalize rows
  const rows = (optionChain.displayData ?? optionChain.data ?? [])
    .filter((r) => r.CE || r.PE)
    .sort((a, b) => a.strikePrice - b.strikePrice);

  const atm = findATM(rows, spot);
  const detectedExpiry = expiry || optionChain.expiry || (rows[0]?.CE?.expiryDate ?? "Current Expiry");

  // 2. Market Structure
  const msInfo = determineMarketStructure({
    spot,
    open,
    high,
    low,
    prevClose,
    vwap,
    intradayCandles,
  });

  // 3. OI Levels & S/R
  const oiLevels = analyzeOILevels(rows, spot, atm);

  // 4. Weighted Scoring (-100 to +100)
  const scoreResult = calculateWeightedOptionScore({
    spot,
    open,
    high,
    low,
    prevClose,
    vwap,
    marketStructureInfo: msInfo,
    oiLevels,
    rows,
    atm,
  });

  const { finalScore, bullishScore, bearishScore, confirmedFactors } = scoreResult;

  // 5. Signal Rules Evaluation
  // BUY CE: Score >= +60 and >= 3 independent confirmed factors
  // BUY PE: Score <= -60 and >= 3 independent confirmed factors
  // NO TRADE otherwise or if conflicting
  let primarySignal = "NO TRADE";
  let activeConfirmedList = [];
  let noTradeReason = null;

  if (finalScore >= 60 && confirmedFactors.bullish.length >= 3) {
    primarySignal = "BUY CE";
    activeConfirmedList = [...confirmedFactors.bullish];
  } else if (finalScore <= -60 && confirmedFactors.bearish.length >= 3) {
    primarySignal = "BUY PE";
    activeConfirmedList = [...confirmedFactors.bearish];
  }
  if (requireFreshData && (!marketOpen || !expiryIsActive(detectedExpiry, now) || !isFresh(optionChain.timestamp, now) ||
      confirmedDirection({ candles: intradayCandles.map((c) => ({ ...c, date: c.date })), now, spot }) !== (primarySignal === "BUY CE" ? 1 : primarySignal === "BUY PE" ? -1 : 0))) {
    primarySignal = "NO TRADE";
    noTradeReason = "Fresh option quotes and two completed 5-minute candles are required.";
  }

  // 6. Option Selection
  const optionSelected = selectOptionToBuy({
    signal: primarySignal,
    rows,
    atm,
    expiry: detectedExpiry,
  });

  // Check liquidity guard: if recommended option has zero volume/OI, revert to NO TRADE
  if (primarySignal !== "NO TRADE" && (!optionSelected || optionSelected.volume < 1000)) {
    primarySignal = "NO TRADE";
    noTradeReason = "Recommended option contract lacked required minimum liquidity.";
  }

  // 7. Entry, Stop, Targets
  const tradeLevels = calculateNextDayTradeLevels({
    spot,
    signal: primarySignal,
    high,
    low,
    oiLevels,
    optionSelected,
  });

  // R:R Guard: If R:R < 1.5, revert to NO TRADE
  if (primarySignal !== "NO TRADE" && tradeLevels.riskRewardRatio < 1.5) {
    primarySignal = "NO TRADE";
    noTradeReason = `Risk/reward (${tradeLevels.riskRewardRatio}) below 1:1.5 minimum.`;
  }

  const isNoTrade = primarySignal === "NO TRADE";
  const finalOption = isNoTrade ? null : optionSelected;
  const finalLevels = isNoTrade
    ? calculateNextDayTradeLevels({ signal: "NO TRADE" })
    : tradeLevels;
  if (isNoTrade) {
    activeConfirmedList = [];
  }

  // 8. Confidence Assessment
  const confidence = isNoTrade
    ? "LOW"
    : determineConfidence({
        finalScore,
        confirmedFactorsList: activeConfirmedList,
        optionContract: finalOption,
      });

  return {
    status: "SUCCESS",
    date: analysisDate,
    time: analysisTime,
    setupOnly: true,
    requiresRevalidation: true,
    spot,
    dayChangePct: Number(msInfo.dayChangePct.toFixed(2)),
    marketStructure: msInfo.structure,
    support1: oiLevels.support1,
    support2: oiLevels.support2,
    resistance1: oiLevels.resistance1,
    resistance2: oiLevels.resistance2,
    pcr: oiLevels.pcr,
    changeOiPcr: oiLevels.changeOiPcr,
    bullishScore,
    bearishScore,
    finalScore,
    primarySignal,
    recommendedOption: finalOption,
    tradeLevels: finalLevels,
    confidence,
    whyReasons: isNoTrade ? [] : activeConfirmedList.slice(0, 4),
    invalidation: finalLevels.underlyingInvalidation,
    reason: noTradeReason,
  };
}

/**
 * Formats the signal into the exact Section 12 required report structure.
 *
 * @param {object} res Result of generate315NextDayOptionSignal
 * @returns {string}
 */
export function formatNextDaySignalFull(res) {
  if (res.status === "DATA_UNAVAILABLE") {
    return `NIFTY NEXT-DAY OPTION SIGNAL
Date: ${res.date}
Analysis Time: 3:15 PM IST

PRIMARY SIGNAL:
NO TRADE — DATA UNAVAILABLE

Reason:
${res.reason || "Reliable 3:15 PM option chain or spot data was not returned by market feeds."}

IMPORTANT:
Never fabricate option-chain values. Wait for active market connection before placing orders.`;
  }

  const opt = res.recommendedOption;
  const tl = res.tradeLevels;

  const optText = opt ? `${opt.optionName}\nExpiry: ${opt.expiry}` : "None";
  const premiumText = opt ? `₹${opt.ltp}` : "—";
  const whyLines = res.whyReasons?.length
    ? res.whyReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : res.reason || "No confirmed directional setup.";

  return `NIFTY NEXT-DAY OPTION SIGNAL
Date: ${res.date}
Analysis Time: ${res.time}

NIFTY Spot: ${res.spot}
Day Change: ${res.dayChangePct > 0 ? `+${res.dayChangePct}` : res.dayChangePct}%
Market Structure: ${res.marketStructure}

Support 1: ${res.support1}
Support 2: ${res.support2}

Resistance 1: ${res.resistance1}
Resistance 2: ${res.resistance2}

PCR: ${res.pcr.toFixed(2)}
Change-OI PCR: ${res.changeOiPcr.toFixed(2)}

Bullish Score: ${res.bullishScore}
Bearish Score: ${res.bearishScore}
Final Score: ${res.finalScore > 0 ? `+${res.finalScore}` : res.finalScore}

PRIMARY SIGNAL:
${res.primarySignal}

Recommended Option:
${optText}

Current Premium: ${premiumText}

Next-Day Entry Trigger:
${tl.entryTrigger}

Option Entry Zone:
${tl.entryZone}

Stop Loss:
${tl.stopLoss > 0 ? `₹${tl.stopLoss}` : "—"}

Target 1:
${tl.target1 > 0 ? `₹${tl.target1}` : "—"}

Target 2:
${tl.target2 > 0 ? `₹${tl.target2}` : "—"}

Risk/Reward:
1:${tl.riskRewardRatio}

Confidence:
${res.confidence}

WHY:
${whyLines}

INVALIDATION:
${res.invalidation}

IMPORTANT:
This is a conditional setup from the analysis time above, not an executed entry.
Premium stop/target levels are indicative estimates. Requote after two completed 5-minute candles beyond the trigger and recalculate from the actual fill, spread and costs.
Exit the held option at stop, target, underlying invalidation, confirmed reversal or 15:20 IST.
Do not chase the option if the next-day opening has already moved substantially beyond the entry trigger.`;
}

/**
 * Formats the signal into the exact Section 14 compact Telegram-ready format.
 *
 * @param {object} res Result of generate315NextDayOptionSignal
 * @returns {string}
 */
export function formatNextDaySignalTelegram(res) {
  if (res.status === "DATA_UNAVAILABLE") {
    return `⚪ NO TRADE — DATA UNAVAILABLE

Reliable 3:15 PM option chain or spot data was not returned by market feeds.

Reason:
${res.reason || "Spot price or option chain unavailable."}

Action:
Do not force an option buy.
Wait for market feeds to restore.`;
  }

  if (res.primarySignal === "NO TRADE") {
    const scoreVal = res.finalScore ?? 0;
    const scoreStr = scoreVal > 0 ? `+${scoreVal}` : `${scoreVal}`;
    return `⚪ NO TRADE

NIFTY next-day option setup is inconclusive at 3:15 PM.

Score: ${scoreStr}/100

Reason:
${res.reason || "CE and PE option-chain signals are conflicting."}

Action:
Do not force an option buy.
Wait for next-day price confirmation.`;
  }

  const opt = res.recommendedOption;
  const tl = res.tradeLevels;
  const isCE = res.primarySignal === "BUY CE";
  const icon = isCE ? "🟢" : "🔴";
  const bias = isCE ? "BULLISH" : "BEARISH";

  const reasonsList = res.whyReasons?.length
    ? res.whyReasons.map((r) => `• ${r}`).join("\n")
    : `• Option chain confirms directional institutional accumulation`;

  return `📊 NIFTY NEXT-DAY SETUP
⏰ ${res.time || "3:15 PM IST"}

NIFTY: ${res.spot}
Bias: ${bias}

${icon} SIGNAL: BUY ${opt?.strike} ${isCE ? "CE" : "PE"}

Expiry: ${opt?.expiry ?? "Current"}
Entry: ${tl.entryZone}
Indicative SL: ₹${tl.stopLoss}
T1: ₹${tl.target1}
T2: ₹${tl.target2}

Trigger:
${isCE ? `NIFTY > ${tl.triggerSpot}` : `NIFTY < ${tl.triggerSpot}`}

Support:
${res.support1}

Resistance:
${res.resistance1}

Score: ${res.finalScore > 0 ? `+${res.finalScore}` : res.finalScore}/100
Confidence: ${res.confidence}
Requote and recalculate from the actual fill after two completed 5-minute candles confirm the trigger. Exit at stop, target, invalidation, reversal or 15:20 IST.

Reason:
${reasonsList}

⚠️ Invalidation:
${res.invalidation}`;
}
