import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCandles, validateCandles } from "../../src/engine/data/candleValidator.js";
import { detectGaps } from "../../src/engine/data/gapDetector.js";
import { createDateWindows } from "../../src/engine/data/dateWindows.js";
import { mapUpstoxCandles } from "../../src/engine/data/candleMapper.js";
import { downloadHistoricalDataset } from "../../src/engine/data/downloader.js";

const row = (date, close = 10) => [date, close, close + 1, close - 1, close, 100, 0];
test("validation rejects impossible OHLC and negative volume", () => {
  assert.throws(() => validateCandles([{ timestamp: "2024-01-01T00:00:00Z", open: 10, high: 9, low: 8, close: 10, volume: -1 }]));
});
test("normalization sorts and removes duplicate timestamps deterministically", () => {
  const c = (timestamp, close) => ({ timestamp, open: close, high: close + 1, low: close - 1, close, volume: 10 });
  const result = normalizeCandles([c("2024-01-02T00:00:00Z", 2), c("2024-01-01T00:00:00Z", 1), c("2024-01-01T00:00:00Z", 1.5)]);
  assert.equal(result.duplicatesRemoved, 1); assert.deepEqual(result.candles.map((x) => x.close), [1.5, 2]);
});
test("gap detector reports missing intervals", () => {
  const values = ["2024-01-01T09:15:00Z", "2024-01-01T09:20:00Z", "2024-01-01T09:30:00Z"].map((timestamp) => ({ timestamp }));
  assert.equal(detectGaps(values, { expectedMinutes: 5 })[0].missingIntervals, 1);
});
test("daily gap detection ignores weekends but reports missing weekdays", () => {
  const c = (timestamp) => ({ timestamp });
  assert.equal(detectGaps([c("2024-01-05T00:00:00Z"), c("2024-01-08T00:00:00Z")], { expectedMinutes: 1440, weekdaysOnly: true }).length, 0);
  assert.equal(detectGaps([c("2024-01-05T00:00:00Z"), c("2024-01-09T00:00:00Z")], { expectedMinutes: 1440, weekdaysOnly: true })[0].missingIntervals, 1);
});
test("date windows are non-overlapping and cover the range", () => {
  assert.deepEqual(createDateWindows("2024-01-01", "2024-03-05", 30), [
    { fromDate: "2024-01-01", toDate: "2024-01-30" }, { fromDate: "2024-01-31", toDate: "2024-02-29" }, { fromDate: "2024-03-01", toDate: "2024-03-05" }
  ]);
});
test("downloader integrates chunk pages, normalization and metadata", async () => {
  let calls = 0;
  const fetchPage = async ({ fromDate }) => { calls++; return { data: { candles: [row(`${fromDate}T00:00:00Z`), row(`${fromDate}T00:00:00Z`)] } }; };
  const result = await downloadHistoricalDataset({ instrumentKey: "NSE_EQ|TEST", timeframe: "1m", fromDate: "2024-01-01", toDate: "2024-02-01", requestsPerSecond: 10000, fetchPage });
  assert.equal(calls, 2); assert.equal(result.metadata.duplicatesRemoved, 2); assert.equal(result.candles.length, 2);
});

test("dateWindows rejects invalid calendar dates and non-positive maxWindowDays", () => {
  assert.throws(() => createDateWindows("2024-02-31", "2024-03-05", 30), /Invalid calendar date/);
  assert.throws(() => createDateWindows("not-a-date", "2024-03-05", 30), /Invalid date format/);
  assert.throws(() => createDateWindows("2024-01-01", "2024-03-05", 0), /positive integer/);
  assert.throws(() => createDateWindows("2024-01-01", "2024-03-05", -5), /positive integer/);
  assert.throws(() => createDateWindows("2024-01-01", "2024-03-05", NaN), /positive integer/);
});

test("mapUpstoxCandles rejects blank or non-finite numeric values", () => {
  assert.throws(() => mapUpstoxCandles([["2024-01-01T00:00:00Z", null, 105, 95, 100, 1000, 0]]), /must not be blank/);
  assert.throws(() => mapUpstoxCandles([["2024-01-01T00:00:00Z", "", 105, 95, 100, 1000, 0]]), /must not be blank/);
  assert.throws(() => mapUpstoxCandles([["2024-01-01T00:00:00Z", 100, "NaN", 95, 100, 1000, 0]]), /finite number/);
  assert.throws(() => mapUpstoxCandles([["2024-01-01T00:00:00Z", 100, 105, 95, 100, Infinity, 0]]), /finite number/);

  // Valid rows map correctly
  const mapped = mapUpstoxCandles([["2024-01-01T00:00:00Z", "100.5", 105, 95, 100, 1000, null]]);
  assert.equal(mapped[0].open, 100.5);
  assert.equal(mapped[0].openInterest, null);
});
