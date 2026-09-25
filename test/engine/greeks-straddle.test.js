// test/engine/greeks-straddle.test.js
import test from "node:test";
import assert from "node:assert/strict";

import {
  cnd,
  npdf,
  calcOptionGreeks,
  calcRowGreeks,
  calcATMStraddle,
} from "../../src/components/OptionChainNew/utils/greeksEngine.js";

test("Greeks Engine: Normal CDF (cnd) conforms to standard distribution values", () => {
  assert.equal(cnd(0), 0.5);
  assert.ok(Math.abs(cnd(1.96) - 0.975) < 0.001);
  assert.ok(Math.abs(cnd(-1.96) - 0.025) < 0.001);
  assert.ok(cnd(5) > 0.9999);
  assert.ok(cnd(-5) < 0.0001);
});

test("Greeks Engine: Black-Scholes calculates accurate Delta for Call and Put options", () => {
  const spot = 24500;
  const strike = 24500;
  const tYears = 7 / 365;
  const iv = 14.0; // 14%

  // ATM Call Delta should be near 0.50
  const ceATM = calcOptionGreeks({ spot, strike, tYears, iv, side: "CE", lotSize: 25 });
  assert.ok(ceATM.delta >= 0.45 && ceATM.delta <= 0.55, `CE Delta ${ceATM.delta} not near 0.50`);

  // ATM Put Delta should be near -0.50
  const peATM = calcOptionGreeks({ spot, strike, tYears, iv, side: "PE", lotSize: 25 });
  assert.ok(peATM.delta <= -0.45 && peATM.delta >= -0.55, `PE Delta ${peATM.delta} not near -0.50`);

  // Deep ITM Call (Strike 23500 vs Spot 24500)
  const itmCE = calcOptionGreeks({ spot, strike: 23500, tYears, iv, side: "CE" });
  assert.ok(itmCE.delta > 0.90, `Deep ITM Call Delta ${itmCE.delta} should be > 0.90`);

  // Deep OTM Call (Strike 25500 vs Spot 24500)
  const otmCE = calcOptionGreeks({ spot, strike: 25500, tYears, iv, side: "CE" });
  assert.ok(otmCE.delta < 0.15, `Deep OTM Call Delta ${otmCE.delta} should be < 0.15`);
});

test("Greeks Engine: Gamma, Vega, and Theta behave according to financial options theory", () => {
  const spot = 24500;
  const strike = 24500;
  const tYears = 7 / 365;
  const iv = 14.0;
  const lotSize = 25;

  const ce = calcOptionGreeks({ spot, strike, tYears, iv, side: "CE", lotSize });
  const pe = calcOptionGreeks({ spot, strike, tYears, iv, side: "PE", lotSize });

  // Gamma and Vega are positive and equal for both call and put
  assert.ok(ce.gamma > 0);
  assert.equal(ce.gamma, pe.gamma);
  assert.ok(ce.vega > 0);
  assert.equal(ce.vega, pe.vega);

  // Theta is negative (decay)
  assert.ok(ce.thetaDaily < 0, `Call theta should be negative, got ${ce.thetaDaily}`);
  assert.ok(pe.thetaDaily < 0, `Put theta should be negative, got ${pe.thetaDaily}`);

  // Rupee theta decay scales with lot size
  assert.equal(ce.thetaDailyLot, Math.round(Math.abs(ce.thetaDaily) * lotSize));
  assert.equal(pe.thetaDailyLot, Math.round(Math.abs(pe.thetaDaily) * lotSize));
});

test("Greeks Engine: calcRowGreeks calculates both legs simultaneously", () => {
  const row = {
    strikePrice: 24500,
    CE: { impliedVolatility: 13.5 },
    PE: { impliedVolatility: 14.2 },
  };

  const greeks = calcRowGreeks(row, 24500, 7 / 365, 25);
  assert.ok(greeks.CE);
  assert.ok(greeks.PE);
  assert.ok(greeks.CE.delta > 0);
  assert.ok(greeks.PE.delta < 0);
  assert.ok(greeks.CE.thetaDailyLot > 0);
  assert.ok(greeks.PE.thetaDailyLot > 0);
});

test("ATM Straddle Engine: Accurately calculates combined premium, expected move, and expiry band", () => {
  const spot = 24520;
  const atm = 24500;
  const rows = [
    {
      strikePrice: 24500,
      CE: { lastPrice: 135, change: -12, impliedVolatility: 14 },
      PE: { lastPrice: 115, change: -8, impliedVolatility: 14.5 },
    },
  ];

  const straddle = calcATMStraddle(rows, atm, spot, 7 / 365, 25);
  assert.ok(straddle);
  assert.equal(straddle.straddlePremium, 250); // 135 + 115
  assert.equal(straddle.straddleChange, -20); // -12 + -8
  assert.equal(straddle.expectedUpper, 24520 + 250); // 24770
  assert.equal(straddle.expectedLower, 24520 - 250); // 24270
  assert.equal(straddle.expectedMovePts, 250);
  assert.ok(straddle.expectedMovePct > 1.0);

  // Negative change of -20 pts should trigger DECAYING status
  assert.equal(straddle.regime.status, "DECAYING");
  assert.match(straddle.regime.label, /Theta Crush/);
  assert.ok(straddle.combinedThetaLot > 0);
});

test("ATM Straddle Engine: Expanding regime is identified on volatility spike", () => {
  const spot = 24500;
  const atm = 24500;
  const rows = [
    {
      strikePrice: 24500,
      CE: { lastPrice: 160, change: 25, impliedVolatility: 18 },
      PE: { lastPrice: 140, change: 15, impliedVolatility: 17 },
    },
  ];

  const straddle = calcATMStraddle(rows, atm, spot, 7 / 365, 25);
  assert.ok(straddle);
  assert.equal(straddle.straddlePremium, 300);
  assert.equal(straddle.straddleChange, 40);
  assert.equal(straddle.regime.status, "EXPANDING");
  assert.match(straddle.regime.label, /Volatility Spike/);
});

test("ATM Straddle Engine: Returns null gracefully when data is missing", () => {
  assert.equal(calcATMStraddle([], 24500, 24500), null);
  assert.equal(calcATMStraddle(null, 24500, 24500), null);
});
