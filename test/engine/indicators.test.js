import test from "node:test";
import assert from "node:assert/strict";
import { ema } from "../../src/engine/indicators/ema.js";
import { rsi } from "../../src/engine/indicators/rsi.js";
import { macd } from "../../src/engine/indicators/macd.js";
import { atr } from "../../src/engine/indicators/atr.js";
import { adx } from "../../src/engine/indicators/adx.js";
import { volumeRatio } from "../../src/engine/indicators/volume.js";
import { candles } from "./helpers.js";

test("EMA seeds with SMA and then recurses", () => assert.deepEqual(ema([1, 2, 3, 4], 3), [null, null, 2, 3]));
test("RSI uses Wilder smoothing and reaches 100 for only gains", () => assert.equal(rsi([1, 2, 3, 4, 5, 6], 3).at(-1), 100));
test("MACD is zero for a constant series after warm-up", () => {
  const result = macd(Array(60).fill(10));
  assert.equal(result.macdLine.at(-1), 0); assert.equal(result.signalLine.at(-1), 0); assert.equal(result.histogram.at(-1), 0);
});
test("ATR uses Wilder smoothing", () => {
  const input = [
    { high: 10, low: 8, close: 9 }, { high: 12, low: 9, close: 11 },
    { high: 13, low: 10, close: 12 }, { high: 15, low: 11, close: 14 }
  ];
  assert.equal(atr(input, 2)[2], 3); assert.equal(atr(input, 2)[3], 3.5);
});
test("ADX exposes aligned ADX, +DI and -DI arrays", () => {
  const result = adx(candles(80, 1), 14);
  assert.equal(result.adx.length, 80); assert.ok(result.adx.at(-1) > 0); assert.ok(result.plusDI.at(-1) > result.minusDI.at(-1));
});
test("volume ratio denominator uses only previous candles", () => {
  assert.deepEqual(volumeRatio([10, 10, 10, 40], 3), [null, null, null, 4]);
});
