// test/engine/option-chain-signal-engine.test.js
import test from "node:test";
import assert from "node:assert/strict";

import { generateSignal, sigMeta } from "../../src/components/OptionChainNew/utils/signalEngine.js";
import { buildupType } from "../../src/components/OptionChainNew/utils/parsers.js";
import { calcInstitutional } from "../../src/components/OptionChainNew/utils/institutionalAnalysis.js";

function buildMockRow(strikePrice, {
  ceLtp = 100, ceChg = 0, ceOi = 50000, ceOiChg = 0, ceVol = 10000,
  peLtp = 100, peChg = 0, peOi = 50000, peOiChg = 0, peVol = 10000,
} = {}) {
  return {
    strikePrice,
    CE: {
      lastPrice: ceLtp,
      change: ceChg,
      openInterest: ceOi,
      changeinOpenInterest: ceOiChg,
      totalTradedVolume: ceVol,
    },
    PE: {
      lastPrice: peLtp,
      change: peChg,
      openInterest: peOi,
      changeinOpenInterest: peOiChg,
      totalTradedVolume: peVol,
    },
  };
}

test("Option Chain Signal Engine: Bullish setup triggers BUY CALL with high conviction", () => {
  const atm = 24500;
  const spot = 24520;
  const strikes = [24300, 24400, 24500, 24600, 24700];

  const rows = strikes.map((sp) => {
    const isAtmOrNear = Math.abs(sp - atm) <= 100;
    return buildMockRow(sp, {
      ceLtp: 120,
      ceChg: 15, // Call price rising
      ceOi: sp >= atm ? 80000 : 20000,
      ceOiChg: isAtmOrNear ? -5000 : -2000, // Call unwinding
      ceVol: 35000,
      peLtp: 80,
      peChg: -15, // Put price falling
      peOi: sp <= atm ? 150000 : 30000,
      peOiChg: isAtmOrNear ? 20000 : 5000, // Put writing
      peVol: 15000,
    });
  });

  const sig = generateSignal(rows, atm, 1.45, spot);

  assert.equal(sig.rawSignal, "BUY CALL");
  assert.equal(sig.strengthLabel, "Strong");
  assert.ok(sig.strength >= 70, `Expected strength >= 70, got ${sig.strength}`);
  assert.equal(sig.oiChangeBias, "Put writing / Bullish support");
  assert.match(sig.signal, /Consider buying a Call/);
});

test("Option Chain Signal Engine: Bearish setup triggers BUY PUT with high conviction", () => {
  const atm = 24500;
  const spot = 24480;
  const strikes = [24300, 24400, 24500, 24600, 24700];

  const rows = strikes.map((sp) => {
    const isAtmOrNear = Math.abs(sp - atm) <= 100;
    return buildMockRow(sp, {
      ceLtp: 70,
      ceChg: -20, // Call price falling
      ceOi: sp >= atm ? 160000 : 30000,
      ceOiChg: isAtmOrNear ? 25000 : 5000, // Call writing
      ceVol: 12000,
      peLtp: 130,
      peChg: 20, // Put price rising
      peOi: sp <= atm ? 60000 : 20000,
      peOiChg: isAtmOrNear ? -8000 : -2000, // Put unwinding
      peVol: 30000,
    });
  });

  const sig = generateSignal(rows, atm, 0.65, spot);

  assert.equal(sig.rawSignal, "BUY PUT");
  assert.equal(sig.strengthLabel, "Strong");
  assert.ok(sig.strength >= 70, `Expected strength >= 70, got ${sig.strength}`);
  assert.equal(sig.oiChangeBias, "Call writing / Bearish resistance");
  assert.match(sig.signal, /Consider buying a Put/);
});

test("Option Chain Signal Engine: Conflicted market does NOT produce a false BUY CALL", () => {
  const atm = 24500;
  const spot = 24450;
  const strikes = [24300, 24400, 24500, 24600, 24700];

  // Conflicted: High historical PCR (1.5), but today's price is collapsing and heavy Call writing is overhead
  const rows = strikes.map((sp) => {
    const isAtmOrNear = Math.abs(sp - atm) <= 100;
    return buildMockRow(sp, {
      ceLtp: 60,
      ceChg: -30, // Call price crashing
      ceOi: 100000,
      ceOiChg: isAtmOrNear ? 30000 : 10000, // Aggressive Call writing
      ceVol: 20000,
      peLtp: 140,
      peChg: 30, // Put price jumping
      peOi: 150000,
      peOiChg: isAtmOrNear ? -15000 : 0, // Put writers abandoning
      peVol: 25000,
    });
  });

  const sig = generateSignal(rows, atm, 1.5, spot);

  // Must NOT trigger BUY CALL during an intraday crash
  assert.notEqual(sig.rawSignal, "BUY CALL");
});

test("Option Chain Signal Engine: Neutral / Directionless market outputs NO TRADE with low strength", () => {
  const atm = 24500;
  const spot = 24500;
  const strikes = [24300, 24400, 24500, 24600, 24700];

  const rows = strikes.map((sp) => buildMockRow(sp, {
    ceLtp: 100, ceChg: 0, ceOi: 50000, ceOiChg: 100, ceVol: 10000,
    peLtp: 100, peChg: 0, peOi: 50000, peOiChg: 100, peVol: 10000,
  }));

  const sig = generateSignal(rows, atm, 1.0, spot);

  assert.equal(sig.rawSignal, "NO TRADE");
  assert.equal(sig.signal, "WAIT — No clear direction");
  // Strength must NOT be artificially inflated to 70%+
  assert.ok(sig.strength < 50, `Expected strength < 50, got ${sig.strength}`);
  assert.equal(sig.strengthLabel, "Weak");
});

test("Option Chain Signal Engine: Handles empty or invalid data gracefully", () => {
  const emptySig = generateSignal([], 0, 0, 0);
  assert.equal(emptySig.rawSignal, "NO TRADE");
  assert.equal(emptySig.strength, 0);

  const nullSig = generateSignal(null, 0, 0, 0);
  assert.equal(nullSig.rawSignal, "NO TRADE");
  assert.equal(nullSig.strength, 0);
});

test("Option Chain Signal Engine: Breakout at resistance does not penalize bullish signal", () => {
  const atm = 24500;
  const spot = 24590; // Testing resistance at 24600
  const strikes = [24400, 24500, 24600, 24700];

  const rows = strikes.map((sp) => buildMockRow(sp, {
    ceLtp: 110,
    ceChg: 25, // Calls surging
    ceOi: sp === 24600 ? 120000 : 40000,
    ceOiChg: -20000, // Short covering / unwinding at the resistance wall!
    ceVol: 50000,
    peLtp: 40,
    peChg: -25,
    peOi: 80000,
    peOiChg: 15000,
    peVol: 20000,
  }));

  const sig = generateSignal(rows, atm, 1.35, spot);

  assert.equal(sig.rawSignal, "BUY CALL");
  assert.ok(sig.strength >= 70);
});

test("Strike Table Buildup: Side-aware buildup correctly differentiates CE and PE", () => {
  // Put leg with OI increasing and price dropping = Put Writing (Support)
  const supportPutRow = buildMockRow(24300, {
    peLtp: 45,
    peChg: -5,
    peOiChg: 35000, // Short build-up on PE
  });
  assert.equal(buildupType(supportPutRow, "PE"), "Short Build-up");

  // Call leg with OI increasing and price dropping = Call Writing (Resistance)
  const resistCallRow = buildMockRow(24700, {
    ceLtp: 40,
    ceChg: -6,
    ceOiChg: 40000, // Short build-up on CE
  });
  assert.equal(buildupType(resistCallRow, "CE"), "Short Build-up");

  // Call leg with OI decreasing and price rising = Short Covering (Squeeze)
  const squeezeCallRow = buildMockRow(24600, {
    ceLtp: 75,
    ceChg: 15,
    ceOiChg: -15000,
  });
  assert.equal(buildupType(squeezeCallRow, "CE"), "Short Covering");
});

test("Option Chain Signal Engine: Dominant Call writing with minor CE unwind above ATM does not trigger bullish OI bias", () => {
  const atm = 24500;
  const spot = 24500;
  const strikes = [24300, 24400, 24500, 24600, 24700];

  // nearCeDelta is massive (60000), nearPeDelta is small (1000)
  // One CE strike at 24600 has a tiny -1 unwind
  const rows = strikes.map((sp) => buildMockRow(sp, {
    ceLtp: 100,
    ceChg: -5,
    ceOi: 100000,
    ceOiChg: sp === 24600 ? -1 : (sp === 24500 ? 60001 : 1000), // nearCeDelta = 60000
    ceVol: 20000,
    peLtp: 100,
    peChg: 5,
    peOi: 100000,
    peOiChg: sp === 24500 ? 1000 : 0, // nearPeDelta = 1000
    peVol: 10000,
  }));

  const sig = generateSignal(rows, atm, 0.9, spot);

  assert.notEqual(sig.oiChangeBias, "Put writing / Bullish support");
  assert.equal(sig.oiChangeBias, "Call writing / Bearish resistance");
});

test("Institutional Analysis: Nearer zone is selected when both support and resistance are within step", () => {
  // Support at 90, Resistance at 100, step = 10. Spot = 91.
  // Support is 1 point away, Resistance is 9 points away.
  const rows = [
    buildMockRow(80, { peOi: 10000 }),
    buildMockRow(90, { peOi: 50000, peOiChg: 5000, peChg: -1 }), // Support floor holding
    buildMockRow(100, { ceOi: 50000, ceOiChg: 5000, ceChg: -1 }), // Resistance wall
    buildMockRow(110, { ceOi: 10000 }),
  ];

  const analysis = calcInstitutional(rows, 91, 90, 1.3);
  assert.ok(analysis);
  // Spot at 91 is closer to support at 90; support floor holding should give a positive / bullish zone bias
  assert.equal(analysis.smartBias, "BULLISH");
});

test("Institutional Analysis: Reads the exact leg matching closestRes rather than topRes3[0]", () => {
  // Strikes above spot (24520): 24600 and 25000
  // 25000 has highest total OI (topRes3[0]), but 24600 is closestRes.
  // 24600 is holding firm (OI added), while 25000 has unwinding.
  const rows = [
    buildMockRow(24400, { peOi: 80000, peOiChg: 2000 }),
    buildMockRow(24500, { peOi: 120000, peOiChg: 5000 }),
    buildMockRow(24600, { ceOi: 60000, ceOiChg: 10000, ceChg: -5 }), // closestRes: resistance wall holding
    buildMockRow(25000, { ceOi: 200000, ceOiChg: -20000, ceChg: 10 }), // topRes3[0]: unwinding far away
  ];

  // Spot 24590 is near 24600 (within step = 100).
  const analysis = calcInstitutional(rows, 24590, 24500, 1.0);
  assert.ok(analysis);
  // Because 24600 is holding (ceOiChg > 0), it should NOT be flagged as breakout
  assert.notEqual(analysis.smartBias, "BULLISH");
});

