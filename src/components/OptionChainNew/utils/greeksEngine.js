// ═══════════════════════════════════════════════════════════════
// OPTION GREEKS & ATM STRADDLE ENGINE (pure functions)
// Black-Scholes pricing model, Greeks (Δ, Γ, Θ, ν), and
// ATM Straddle Expected Move Band calculations.
// ═══════════════════════════════════════════════════════════════

/**
 * Standard normal cumulative distribution function (CDF).
 * High-precision Abramowitz & Stegun polynomial approximation (Formula 7.1.26).
 * Max absolute error < 1.5e-7.
 *
 * @param {number} x
 * @returns {number}
 */
export function cnd(x) {
  if (isNaN(x)) return 0.5;
  if (x === 0) return 0.5;
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal probability density function (PDF).
 *
 * @param {number} x
 * @returns {number}
 */
export function npdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate Black-Scholes Option Greeks for a single leg.
 *
 * @param {object} params
 * @param {number} params.spot Current underlying spot price
 * @param {number} params.strike Strike price
 * @param {number} params.tYears Time to expiry in years (e.g. days / 365)
 * @param {number} params.iv Implied volatility (e.g. 15.5 for 15.5% or 0.155)
 * @param {number} [params.riskFreeRate=0.065] Annual risk-free interest rate (RBI benchmark 6.5%)
 * @param {"CE"|"PE"} [params.side="CE"] Option side
 * @param {number} [params.lotSize=1] Lot size for rupee theta calculations
 * @returns {{ delta: number, gamma: number, theta: number, thetaDaily: number, thetaDailyLot: number, vega: number, iv: number }}
 */
export function calcOptionGreeks({
  spot,
  strike,
  tYears,
  iv,
  riskFreeRate = 0.065,
  side = "CE",
  lotSize = 1,
}) {
  const isCE = side === "CE";

  // Normalize IV (if expressed as percentage like 15.5, convert to 0.155)
  let vol = Number(iv) || 0;
  if (vol > 1.0) vol = vol / 100;
  // Fallback to reasonable Indian market baseline if missing (14%)
  if (vol <= 0 || !Number.isFinite(vol)) vol = 0.14;

  const t = Math.max(0.0005, Number(tYears) || 0.019); // min ~4 hours
  const r = Number(riskFreeRate) || 0.065;
  const s = Math.max(0.01, Number(spot) || strike);
  const k = Math.max(0.01, Number(strike) || s);

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r + 0.5 * vol * vol) * t) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;

  const nd1 = cnd(d1);
  const npd1 = npdf(d1);
  const discountFactor = Math.exp(-r * t);

  // Delta: Call: N(d1), Put: N(d1) - 1
  const delta = isCE ? nd1 : nd1 - 1;

  // Gamma: identical for Call and Put
  const gamma = npd1 / (s * vol * sqrtT);

  // Vega: points per 1% change in volatility (identical for Call and Put)
  const vega = (s * sqrtT * npd1) / 100;

  // Theta: points decay per calendar day (1/365 of year)
  // Standard Black-Scholes theta (expressed as negative points/day)
  const term1 = -(s * vol * npd1) / (2 * sqrtT);
  let thetaYear = 0;
  if (isCE) {
    thetaYear = term1 - r * k * discountFactor * cnd(d2);
  } else {
    thetaYear = term1 + r * k * discountFactor * cnd(-d2);
  }

  const thetaDaily = thetaYear / 365;
  const thetaDailyLot = Math.round(Math.abs(thetaDaily) * (lotSize || 1));

  return {
    delta: Number(delta.toFixed(3)),
    gamma: Number(gamma.toFixed(5)),
    theta: Number(thetaDaily.toFixed(2)),
    thetaDaily: Number(thetaDaily.toFixed(2)),
    thetaDailyLot, // ₹ decay per day for full lot
    vega: Number(vega.toFixed(2)),
    iv: Number((vol * 100).toFixed(1)),
  };
}

/**
 * Computes Greeks for both CE and PE legs of an OptionRow.
 *
 * @param {object} row OptionRow
 * @param {number} spot Spot price
 * @param {number} tYears Time to expiry in years
 * @param {number} [lotSize=1] Lot size
 * @returns {{ CE: object, PE: object }}
 */
export function calcRowGreeks(row, spot, tYears, lotSize = 1) {
  if (!row || !spot) {
    return {
      CE: { delta: 0, gamma: 0, theta: 0, thetaDaily: 0, thetaDailyLot: 0, vega: 0, iv: 0 },
      PE: { delta: 0, gamma: 0, theta: 0, thetaDaily: 0, thetaDailyLot: 0, vega: 0, iv: 0 },
    };
  }

  const ceGreeks = calcOptionGreeks({
    spot,
    strike: row.strikePrice,
    tYears,
    iv: row.CE?.impliedVolatility || 0,
    side: "CE",
    lotSize,
  });

  const peGreeks = calcOptionGreeks({
    spot,
    strike: row.strikePrice,
    tYears,
    iv: row.PE?.impliedVolatility || 0,
    side: "PE",
    lotSize,
  });

  return {
    CE: ceGreeks,
    PE: peGreeks,
  };
}

/**
 * Calculates the At-The-Money (ATM) Straddle metrics and expected move band.
 *
 * Combined Straddle = ATM Call LTP + ATM Put LTP
 * Expected Expiry Range = [Spot - Combined, Spot + Combined]
 *
 * @param {Array<object>} rows OptionRow[]
 * @param {number} atm ATM strike
 * @param {number} spot Spot price
 * @param {number} [tYears=0.019] Time to expiry in years
 * @param {number} [lotSize=1] Instrument lot size
 * @returns {object|null}
 */
export function calcATMStraddle(rows, atm, spot, tYears = 0.019, lotSize = 1) {
  if (!rows || !rows.length || !atm || !spot) {
    return null;
  }

  const atmRow = rows.find((r) => r.strikePrice === atm);
  if (!atmRow) return null;

  const ceLtp = Number(atmRow.CE?.lastPrice) || 0;
  const peLtp = Number(atmRow.PE?.lastPrice) || 0;
  const ceChg = Number(atmRow.CE?.change) || 0;
  const peChg = Number(atmRow.PE?.change) || 0;

  const straddlePremium = Number((ceLtp + peLtp).toFixed(1));
  const straddleChange = Number((ceChg + peChg).toFixed(1));
  const prevStraddle = straddlePremium - straddleChange;
  const straddleChangePct =
    prevStraddle > 0
      ? Number(((straddleChange / prevStraddle) * 100).toFixed(1))
      : 0;

  const expectedUpper = Math.round(spot + straddlePremium);
  const expectedLower = Math.round(spot - straddlePremium);
  const expectedMovePts = Math.round(straddlePremium);
  const expectedMovePct = spot > 0 ? Number(((straddlePremium / spot) * 100).toFixed(2)) : 0;

  // Compute ATM Greeks
  const atmGreeks = calcRowGreeks(atmRow, spot, tYears, lotSize);
  const combinedThetaPts = Number((atmGreeks.CE.thetaDaily + atmGreeks.PE.thetaDaily).toFixed(1));
  const combinedThetaLot = Math.round((atmGreeks.CE.thetaDailyLot + atmGreeks.PE.thetaDailyLot));

  // Volatility Regime
  let regime = {
    status: "BALANCED",
    label: "Premium Balanced",
    color: "#8b949e",
    desc: "Expected time decay is in equilibrium with current price fluctuations.",
  };

  if (straddleChange < -3) {
    regime = {
      status: "DECAYING",
      label: "Theta Crush / Premium Decaying",
      color: "#3fb950",
      desc: "Combined premium collapsing — favorable for option sellers, range-bound market.",
    };
  } else if (straddleChange > 3) {
    regime = {
      status: "EXPANDING",
      label: "Volatility Spike / Premium Expanding",
      color: "#e3b341",
      desc: "Combined premium expanding rapidly — active directional breakout underway.",
    };
  }

  return {
    atm,
    spot,
    ceLtp,
    peLtp,
    ceChg,
    peChg,
    straddlePremium,
    straddleChange,
    straddleChangePct,
    expectedUpper,
    expectedLower,
    expectedMovePts,
    expectedMovePct,
    combinedThetaPts,
    combinedThetaLot,
    atmGreeks,
    lotSize,
    regime,
  };
}
