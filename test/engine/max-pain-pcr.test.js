import test from "node:test";
import assert from "node:assert/strict";
import { pcrLabel } from "../../src/components/OptionChainNew/utils/formatters.js";
import {
  calcMaxPainCurve,
  calcMaxPainCurveFull,
  calcVolumePCR,
  calcVolumePCRFull,
  getPcrSentiment,
  analyzePcrTrend,
  buildStorageKey,
  STORAGE_PREFIX,
} from "../../src/components/OptionChainNew/utils/maxPainPcrEngine.js";

test("calcMaxPainCurve: accurately calculates strike total loss and identifies Max Pain", () => {
  // 3 strikes: 24000, 24100, 24200
  // Strike 24000: CE OI = 1000, PE OI = 100
  // Strike 24100: CE OI = 500,  PE OI = 500
  // Strike 24200: CE OI = 100,  PE OI = 1000
  const rows = [
    { strikePrice: 24000, CE: { openInterest: 1000 }, PE: { openInterest: 100 } },
    { strikePrice: 24100, CE: { openInterest: 500 },  PE: { openInterest: 500 } },
    { strikePrice: 24200, CE: { openInterest: 100 },  PE: { openInterest: 1000 } },
  ];

  const result = calcMaxPainCurve(rows);

  // At 24000:
  // Call Loss = 0
  // Put Loss = (24100-24000)*500 + (24200-24000)*1000 = 50,000 + 200,000 = 250,000
  // Total Loss = 250,000

  // At 24100:
  // Call Loss = (24100-24000)*1000 = 100,000
  // Put Loss = (24200-24100)*1000 = 100,000
  // Total Loss = 200,000 (MINIMUM)

  // At 24200:
  // Call Loss = (24200-24000)*1000 + (24200-24100)*500 = 200,000 + 50,000 = 250,000
  // Put Loss = 0
  // Total Loss = 250,000

  assert.equal(result.maxPainStrike, 24100);
  assert.equal(result.minLoss, 200000);
  assert.equal(result.curve.length, 3);
  assert.equal(result.curve[0].strike, 24000);
  assert.equal(result.curve[0].totalLoss, 250000);
  assert.equal(result.curve[1].strike, 24100);
  assert.equal(result.curve[1].totalLoss, 200000);
  assert.equal(result.curve[2].strike, 24200);
  assert.equal(result.curve[2].totalLoss, 250000);
});

test("calcMaxPainCurveFull: handles index fullOI array properly", () => {
  const fullOI = [
    { s: 50000, c: 2000, p: 200 },
    { s: 50500, c: 1000, p: 1000 },
    { s: 51000, c: 200,  p: 2000 },
  ];

  const result = calcMaxPainCurveFull(fullOI);
  assert.equal(result.maxPainStrike, 50500);
  assert.equal(result.curve.length, 3);
  assert.ok(result.minLoss > 0);
});

test("calcVolumePCR: calculates PE / CE volume ratio with edge-case handling", () => {
  const rows = [
    { strikePrice: 100, CE: { totalTradedVolume: 1000 }, PE: { totalTradedVolume: 1500 } },
    { strikePrice: 200, CE: { totalTradedVolume: 1000 }, PE: { totalTradedVolume: 500 } },
  ];
  // Total CE: 2000, Total PE: 2000 -> PCR = 1.0
  assert.equal(calcVolumePCR(rows), 1.0);

  // Zero CE volume
  const zeroCE = [
    { strikePrice: 100, CE: { totalTradedVolume: 0 }, PE: { totalTradedVolume: 1000 } },
  ];
  assert.equal(calcVolumePCR(zeroCE), null);

  // Empty rows
  assert.equal(calcVolumePCR([]), null);
  assert.equal(calcVolumePCR(null), null);
});

test("calcVolumePCRFull: calculates volume ratio for index fullOI with cVol and pVol", () => {
  const fullOI = [
    { s: 100, cVol: 500, pVol: 750 },
    { s: 200, cVol: 500, pVol: 250 },
  ];
  // Total CE Vol: 1000, Total PE Vol: 1000 -> PCR = 1.0
  assert.equal(calcVolumePCRFull(fullOI), 1.0);
  assert.equal(calcVolumePCRFull([]), null);
});

test("getPcrSentiment: maps numeric PCR values to correct concentration without inferring direction", () => {
  assert.equal(getPcrSentiment(1.6).sentiment, "neutral");
  assert.equal(getPcrSentiment(1.6).label, "High Put OI");

  assert.equal(getPcrSentiment(1.25).sentiment, "neutral");
  assert.equal(getPcrSentiment(1.25).label, "Put OI dominant");

  assert.equal(getPcrSentiment(1.0).sentiment, "neutral");
  assert.equal(getPcrSentiment(1.0).label, "Balanced OI");

  assert.equal(getPcrSentiment(0.75).sentiment, "neutral");
  assert.equal(getPcrSentiment(0.75).label, "Call OI dominant");

  assert.equal(getPcrSentiment(0.45).sentiment, "neutral");
  assert.equal(getPcrSentiment(0.45).label, "High Call OI");
});

test("PCR labels agree across the tracker and other panels at every boundary", () => {
  for (const pcr of [null, NaN, Infinity, -1, 0, 0.59, 0.6, 0.79, 0.8, 0.82, 1.0, 1.15, 1.2, 1.21, 1.4, 1.42, 1.45]) {
    assert.equal(getPcrSentiment(pcr).label, pcrLabel(pcr), `PCR ${pcr}`);
    assert.equal(getPcrSentiment(pcr).sentiment, "neutral");
  }
  assert.equal(getPcrSentiment(1.42).label, "High Put OI");
  assert.equal(getPcrSentiment(0.82).label, "Balanced OI");
});

test("analyzePcrTrend: detects price down/PCR up divergence when spot falls but PCR rises", () => {
  const baseTime = Date.parse("2026-10-09T05:00:00Z");
  const snapshots = [
    { ts: baseTime, spot: 24200, pcr: 1.0, maxPain: 24100 },
    { ts: baseTime + 15 * 60 * 1000, spot: 24150, pcr: 1.05, maxPain: 24100 },
    { ts: baseTime + 30 * 60 * 1000, spot: 24100, pcr: 1.10, maxPain: 24100 },
  ];

  const analysis = analyzePcrTrend(snapshots, 24100, 24100);

  assert.equal(analysis.direction, "Rising");
  assert.equal(analysis.pcrChange, 0.1);
  assert.ok(analysis.spotChange < 0);
  assert.ok(analysis.divergence !== null);
  assert.equal(analysis.divergence.type, "price_down_pcr_up");
});

test("analyzePcrTrend: detects price up/PCR down divergence when spot rises but PCR falls", () => {
  const baseTime = Date.parse("2026-10-09T05:00:00Z");
  const snapshots = [
    { ts: baseTime, spot: 24000, pcr: 1.2, maxPain: 24000 },
    { ts: baseTime + 15 * 60 * 1000, spot: 24100, pcr: 1.15, maxPain: 24000 },
    { ts: baseTime + 30 * 60 * 1000, spot: 24200, pcr: 1.10, maxPain: 24000 },
  ];

  const analysis = analyzePcrTrend(snapshots, 24200, 24000);

  assert.equal(analysis.direction, "Falling");
  assert.equal(analysis.pcrChange, -0.1);
  assert.ok(analysis.spotChange > 0);
  assert.ok(analysis.divergence !== null);
  assert.equal(analysis.divergence.type, "price_up_pcr_down");
});

test("analyzePcrTrend: detects Max Pain migration and descriptive payout distance", () => {
  const baseTime = Date.parse("2026-10-09T05:00:00Z");
  const snapshots = [
    { ts: baseTime, spot: 24150, pcr: 1.1, maxPain: 24000 },
    { ts: baseTime + 30 * 60 * 1000, spot: 24180, pcr: 1.15, maxPain: 24100 },
  ];

  const analysis = analyzePcrTrend(snapshots, 24180, 24100);

  assert.ok(analysis.maxPainMigration !== null);
  assert.equal(analysis.maxPainMigration.from, 24000);
  assert.equal(analysis.maxPainMigration.to, 24100);
  assert.equal(analysis.maxPainMigration.shift, 100);
  assert.equal(analysis.maxPainMigration.type, "observed_shift");

  assert.ok(analysis.gravityPull !== null);
  assert.equal(analysis.gravityPull.targetStrike, 24100);
  assert.equal(analysis.gravityPull.distancePts, 80);
  assert.equal(analysis.gravityPull.bias, "Above Max Pain");
});

test("buildStorageKey: generates consistent standardized keys", () => {
  const key1 = buildStorageKey("NIFTY", "26-SEP-2024", "2024-09-17");
  assert.equal(key1, `${STORAGE_PREFIX}NIFTY_26SEP2024_2024-09-17`);

  const key2 = buildStorageKey("reliance", null, "2024-09-17");
  assert.equal(key2, `${STORAGE_PREFIX}RELIANCE_CURRENT_2024-09-17`);
});
