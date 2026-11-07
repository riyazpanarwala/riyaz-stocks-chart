import test from "node:test";
import assert from "node:assert/strict";
import { ema } from "../../src/engine/indicators/ema.js";
import { rsi } from "../../src/engine/indicators/rsi.js";
import { macd } from "../../src/engine/indicators/macd.js";
import { atr } from "../../src/engine/indicators/atr.js";
import { adx } from "../../src/engine/indicators/adx.js";
import { volumeRatio } from "../../src/engine/indicators/volume.js";
import { vwap } from "../../src/engine/indicators/vwap.js";
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

const vwapCandle = (date, price, volume, extra = {}) => ({
  date, high: price + 1, low: price - 1, close: price, volume, ...extra,
});

test("VWAP uses typical price and volume weighting", () => {
  const result = vwap([vwapCandle("2026-11-06 09:15:00", 10, 1), vwapCandle("2026-11-06 09:16:00", 20, 3)]);
  assert.equal(result[0].vwap, 10);
  assert.equal(result[1].vwap, 17.5);
});

test("VWAP resets at each Indian trading day", () => {
  const result = vwap([vwapCandle("2026-11-06 09:15:00", 10, 10), vwapCandle("2026-11-06 15:29:00", 20, 10), vwapCandle("2026-11-09 09:15:00", 30, 5)]);
  assert.equal(result[1].vwap, 15);
  assert.equal(result[2].vwap, 30);
});

test("VWAP starts at 09:15 IST and ignores earlier bars", () => {
  const result = vwap([vwapCandle("2026-11-06 09:14:00", 10, 100), vwapCandle("2026-11-06 09:15:00", 20, 1)]);
  assert.equal(result[0].vwap, null);
  assert.equal(result[1].vwap, 20);
});

test("VWAP safely skips missing, zero, negative, and malformed volume or OHLC", () => {
  const result = vwap([
    vwapCandle("2026-11-06 09:15:00", 10, 0),
    vwapCandle("2026-11-06 09:16:00", 20, -2),
    vwapCandle("2026-11-06 09:17:00", 30, undefined),
    vwapCandle("2026-11-06 09:18:00", 40, 2, { high: NaN }),
    vwapCandle("2026-11-06 09:19:00", 50, 2, { low: 55 }),
  ]);
  assert.ok(result.every((entry) => entry.vwap === null));
});

test("VWAP calculates volume-weighted standard deviation bands", () => {
  const result = vwap([vwapCandle("2026-11-06 09:15:00", 10, 1), vwapCandle("2026-11-06 09:16:00", 20, 1)], { bands: [1, 2] });
  assert.equal(result[1].vwap, 15);
  assert.equal(result[1].upper1, 20);
  assert.equal(result[1].lower1, 10);
  assert.equal(result[1].upper2, 25);
  assert.equal(result[1].lower2, 5);
});

test("VWAP parses Date timestamps in Asia/Kolkata", () => {
  const result = vwap([vwapCandle(new Date("2026-11-06T03:45:00.000Z"), 12, 1)]);
  assert.equal(result[0].vwap, 12);
});

test("VWAP honors explicit timestamp offsets and rejects invalid dates", () => {
  const result = vwap([
    vwapCandle("2026-11-06T03:45:00Z", 12, 1),
    vwapCandle("2026-02-31 09:15:00", 20, 5),
  ]);
  assert.equal(result[0].vwap, 12);
  assert.equal(result[1].vwap, null);
});
