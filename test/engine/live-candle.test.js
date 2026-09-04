import test from "node:test";
import assert from "node:assert/strict";
import { constructDailyCandleFromIntraday, mergeLiveDailyCandle } from "../../src/engine/data/liveCandle.js";

const rows = [
  ["2026-09-03T09:17:00+05:30", 102, 105, 101, 104, 300, 7],
  ["2026-09-03T09:15:00+05:30", 100, 103, 99, 102, 100, 5],
  ["2026-09-03T09:16:00+05:30", 102, 104, 100, 102.5, 200, 6]
];

test("one-minute intraday rows construct today's ordered daily OHLCV candle", () => {
  const candle = constructDailyCandleFromIntraday(rows);
  assert.equal(candle.timestamp, "2026-09-02T18:30:00.000Z");
  assert.equal(candle.open, 100); assert.equal(candle.high, 105); assert.equal(candle.low, 99); assert.equal(candle.close, 104);
  assert.equal(candle.volume, 600); assert.equal(candle.openInterest, 7); assert.equal(candle.sourceCandleCount, 3);
});

test("live candle appends after prior history", () => {
  const live = constructDailyCandleFromIntraday(rows);
  const historical = [{ timestamp: "2026-09-01T18:30:00.000Z", open: 98, high: 101, low: 97, close: 100, volume: 500 }];
  const result = mergeLiveDailyCandle(historical, live);
  assert.equal(result.appended, true); assert.equal(result.replaced, false); assert.equal(result.candles.at(-1).close, 104);
});

test("live candle replaces an accidental same-day historical candle", () => {
  const live = constructDailyCandleFromIntraday(rows);
  const historical = [{ timestamp: live.timestamp, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
  const result = mergeLiveDailyCandle(historical, live);
  assert.equal(result.appended, false); assert.equal(result.replaced, true); assert.equal(result.candles.length, 1); assert.equal(result.candles[0].close, 104);
});
