import test from "node:test";
import assert from "node:assert/strict";
import { detectBreakout, detectBreakdown, confirmedSwings, marketStructure } from "../../src/engine/strategy/priceAction.js";
import { classifyMarketRegime } from "../../src/engine/strategy/marketRegime.js";
import { calculateAtrRisk } from "../../src/engine/risk/atrRisk.js";
import { generateSignal, generateSignalAtIndex, generateSignals } from "../../src/engine/strategy/signalEngine.js";
import { candles } from "./helpers.js";

test("breakout and breakdown compare close only with prior range", () => {
  const up = [{ high: 10, low: 5, close: 8 }, { high: 11, low: 6, close: 10 }, { high: 13, low: 7, close: 12 }];
  assert.equal(detectBreakout(up, 2, 2), true); assert.equal(detectBreakdown(up, 2, 2), false);
  up[2].close = 4; assert.equal(detectBreakdown(up, 2, 2), true);
});
test("swings appear only after right-side confirmation", () => {
  const input = [1, 2, 5, 2, 1].map((high, i) => ({ high, low: -high, close: 0 }));
  assert.equal(confirmedSwings(input, 3, 2, 2).highs.length, 0);
  assert.equal(confirmedSwings(input, 4, 2, 2).highs[0].confirmedAt, 4);
});
test("market structure classifies confirmed higher highs and higher lows", () => {
  const values = [1,3,2,4,3,5,4,6,5].map((close) => ({ open: close, high: close + .1, low: close - .1, close, volume: 1, timestamp: new Date(2024,0,1).toISOString() }));
  assert.ok(["BULLISH", "MIXED"].includes(marketStructure(values, values.length - 1, 1, 1).state));
});
test("regime recognizes strong directional stacks", () => {
  assert.equal(classifyMarketRegime({ close: 110, ema20: 105, ema50: 100, ema200: 90, adx: 30, plusDI: 35, minusDI: 10 }), "STRONG_UPTREND");
  assert.equal(classifyMarketRegime({ close: 80, ema20: 85, ema50: 90, ema200: 100, adx: 30, plusDI: 10, minusDI: 35 }), "STRONG_DOWNTREND");
});
test("ATR risk returns configured R targets", () => assert.deepEqual(calculateAtrRisk(100, 2, { atrMultiplier: 1.5, target1R: 2, target2R: 3 }), { entry: 100, stopLoss: 97, target1: 106, target2: 109, riskPerShare: 3, rewardRisk1: 2, rewardRisk2: 3 }));
test("signal includes independent bounded scores and long-only semantics", () => {
  const result = generateSignal(candles(300, 1));
  assert.ok(result.bullishScore >= 0 && result.bullishScore <= 100); assert.ok(result.bearishScore >= 0 && result.bearishScore <= 100);
  assert.ok(["BUY", "HOLD", "EXIT", "NO_TRADE"].includes(result.signal)); assert.notEqual(result.signal, "SELL");
});
test("bullish and bearish scores respond independently to opposite trends", () => {
  const up = generateSignal(candles(300, 1));
  const down = generateSignal(candles(300, -1), { positionState: "LONG" });
  assert.ok(up.bullishScore > up.bearishScore);
  assert.ok(down.bearishScore > down.bullishScore);
  assert.equal(down.signal, "EXIT");
  assert.equal(down.action, "EXIT_LONG");
});
test("bearish setup while flat is AVOID, while the same held setup is EXIT_LONG", () => {
  const input = candles(300, -1);
  const flat = generateSignal(input, { positionState: "FLAT" });
  const held = generateSignal(input, { positionState: "LONG" });
  assert.equal(flat.signal, "NO_TRADE"); assert.equal(flat.action, "AVOID");
  assert.equal(held.signal, "EXIT"); assert.equal(held.action, "EXIT_LONG");
  assert.equal(flat.risk.entry, null); assert.equal(held.risk.entry, null);
});

test("momentum reasons identify RSI and MACD separately", () => {
  const result = generateSignal(candles(300, -1), { positionState: "LONG" });
  assert.ok(result.reasons.includes("RSI below bearish threshold"));
  assert.ok(result.reasons.includes("MACD below signal line"));
  assert.ok(result.reasons.every((reason) => !reason.includes("RSI/MACD")));
});
test("evidence reports exact EMA conditions instead of a broad alignment label", () => {
  const result = generateSignal(candles(300, 1));
  assert.ok(result.evidence.bullish.includes("Price above EMA20"));
  assert.ok(result.evidence.bullish.includes("EMA20 above EMA50"));
  assert.ok(result.evidence.bullish.includes("EMA50 above EMA200"));
  assert.ok([...result.evidence.bullish, ...result.evidence.bearish].every((reason) => !reason.includes("price/EMA alignment")));
});
test("held positions expose both evidence sides and decision checks", () => {
  const result = generateSignal(candles(300, 0.05), { positionState: "LONG" });
  assert.ok(Array.isArray(result.evidence.bullish));
  assert.ok(Array.isArray(result.evidence.bearish));
  assert.ok(Array.isArray(result.evidence.decisionChecks));
});
test("candle-by-candle API returns one aligned result per candle", () => {
  const input = candles(205, 1), results = generateSignals(input);
  assert.equal(results.length, input.length); assert.equal(results[100].timestamp, input[100].timestamp); assert.equal(results[100].status, "INSUFFICIENT_DATA");
});
test("future candles cannot change a historical signal", () => {
  const prefix = candles(260, 1), before = generateSignalAtIndex(prefix, 240);
  const future = candles(30, -1).map((c, i) => ({ ...c, timestamp: new Date(Date.UTC(2026, 0, i + 1)).toISOString() }));
  const after = generateSignalAtIndex([...prefix, ...future], 240);
  assert.deepEqual(after, before);
});

test("protective gates block BUY signals on overbought RSI, low ADX, or low volume", () => {
  const bull = candles(300, 1);

  // Gate 1: rsiOverbought blocks BUY
  const blockedRsi = generateSignal(bull, { config: { thresholds: { rsiOverbought: 50 } } });
  assert.notEqual(blockedRsi.signal, "BUY");
  assert.ok(blockedRsi.reasons.some((r) => r.includes("BUY blocked: RSI is overbought")));

  // Gate 2: adxMin blocks BUY
  const blockedAdx = generateSignal(bull, { config: { thresholds: { adxMin: 99.9 } } });
  assert.notEqual(blockedAdx.signal, "BUY");
  assert.ok(blockedAdx.reasons.some((r) => r.includes("BUY blocked: ADX indicates weak trend")));

  // Gate 3: volumeMin blocks BUY
  const blockedVol = generateSignal(bull, { config: { thresholds: { volumeMin: 5.0 } } });
  assert.notEqual(blockedVol.signal, "BUY");
  assert.ok(blockedVol.reasons.some((r) => r.includes("BUY blocked: Volume ratio below minimum")));
});
