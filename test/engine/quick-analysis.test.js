import test from "node:test";
import assert from "node:assert/strict";
import { analyzeStock, defaultDateRange, formatCompactAnalysis, formatIstTimestamp, isLikelyNseMarketOpen } from "../../src/engine/quick/analyzeStock.js";
import { DEFAULT_INSTRUMENTS, resolveInstrument } from "../../src/engine/config/quickAnalysis.js";
import { candles } from "./helpers.js";

test("TCS resolves to its default NSE Upstox instrument key", () => {
  assert.equal(resolveInstrument("tcs").instrumentKey, "NSE_EQ|INE467B01029");
});

test("quick analysis ends historical download yesterday before adding today's intraday candle", () => {
  assert.deepEqual(defaultDateRange(new Date("2026-09-03T12:00:00Z")), { fromDate: "2024-09-02", toDate: "2026-09-02" });
});

test("one-command analysis downloads and generates a compact signal", async () => {
  let request;
  const result = await analyzeStock("TCS", {
    now: new Date("2026-09-03T12:00:00Z"),
    downloader: async (args) => {
      request = args;
      const values = candles(300, 1);
      return { metadata: { candleCount: values.length }, gaps: [], candles: values };
    },
    includeLiveCandle: false
  });
  assert.equal(request.instrumentKey, "NSE_EQ|INE467B01029");
  assert.equal(request.timeframe, "1d");
  assert.equal(result.signal.status, "READY");
  assert.match(formatCompactAnalysis(result), /^TCS \(1d\)/);
  assert.match(formatCompactAnalysis(result), /Bullish:/);
});

test("NSE market-hours helper uses IST", () => {
  assert.equal(isLikelyNseMarketOpen(new Date("2026-09-03T06:00:00Z")), true);
  assert.equal(isLikelyNseMarketOpen(new Date("2026-09-03T11:00:00Z")), false);
});

test("quick analysis appends today's live aggregate and labels it preliminary", async () => {
  const history = candles(300, 1);
  history[history.length - 1].timestamp = "2026-09-01T18:30:00.000Z";
  const result = await analyzeStock("TCS", {
    now: new Date("2026-09-03T06:00:00Z"),
    downloader: async () => ({ metadata: { candleCount: history.length }, gaps: [], candles: history }),
    intradayFetcher: async () => ({ data: { candles: [
      ["2026-09-03T09:15:00+05:30", 200, 202, 199, 201, 100, 0],
      ["2026-09-03T09:16:00+05:30", 201, 204, 200, 203, 150, 0]
    ] } })
  });
  assert.equal(result.candleStatus, "LIVE_PARTIAL"); assert.equal(result.liveMerge.appended, true);
  assert.equal(result.signal.timestamp, "2026-09-02T18:30:00.000Z"); assert.equal(result.signal.price, 203);
  assert.match(formatCompactAnalysis(result), /LIVE \/ PRELIMINARY/);
});

test("raw Upstox instrument keys remain supported", () => {
  assert.equal(resolveInstrument("NSE_EQ|CUSTOM").instrumentKey, "NSE_EQ|CUSTOM");
});

test("default list contains 19 verified NSE instruments with unique keys", () => {
  const entries = Object.entries(DEFAULT_INSTRUMENTS);
  assert.equal(entries.length, 19);
  assert.ok(entries.every(([, item]) => item.instrumentKey.startsWith("NSE_EQ|")));
  assert.equal(new Set(entries.map(([, item]) => item.instrumentKey)).size, entries.length);
});

test("requested stocks and ETFs resolve to verified instrument keys", () => {
  assert.equal(resolveInstrument("JPPOWER").instrumentKey, "NSE_EQ|INE351F01018");
  assert.equal(resolveInstrument("BEL").instrumentKey, "NSE_EQ|INE263A01024");
  assert.equal(resolveInstrument("SUZLON").instrumentKey, "NSE_EQ|INE040H01021");
  assert.equal(resolveInstrument("NIFTYBEES").instrumentKey, "NSE_EQ|INF204KB14I2");
  assert.equal(resolveInstrument("NEXT50BETA").instrumentKey, "NSE_EQ|INF789F1AUW9");
  assert.equal(resolveInstrument("UTI Nifty Next 50").symbol, "NEXT50BETA");
});

test("UTC candle timestamps are displayed in India Standard Time", () => {
  assert.match(formatIstTimestamp("2026-09-01T18:30:00.000Z"), /02 Sept? 2026.*12:00.*am IST/i);
});

test("compact output hides entry risk for non-BUY signals", () => {
  const output = formatCompactAnalysis({
    instrument: { symbol: "JPPOWER" }, timeframe: "1d",
    signal: { timestamp: "2026-09-01T18:30:00.000Z", signal: "NO_TRADE", action: "AVOID", price: 16.37,
      marketRegime: "DOWNTREND", bullishScore: 0, bearishScore: 65, signalStrength: 65,
      indicators: { rsi: 30.96, adx: 12.06, volumeRatio: 0.64 },
      risk: { entry: null, stopLoss: null, target1: null, target2: null }, reasons: ["MACD below signal line"] }
  });
  assert.match(output, /NO_TRADE \/ AVOID/); assert.doesNotMatch(output, /Entry:/); assert.match(output, /02 Sept? 2026/i);
});

test("compact HOLD output shows evidence on both sides and the decision checks", () => {
  const output = formatCompactAnalysis({
    instrument: { symbol: "BEL" }, timeframe: "1d",
    signal: { timestamp: "2026-09-02T18:30:00.000Z", signal: "HOLD", action: "HOLD_LONG", price: 408.6,
      marketRegime: "DOWNTREND", bullishScore: 7, bearishScore: 36, signalStrength: 29,
      indicators: { rsi: 50.58, adx: 10.6, volumeRatio: 0.78 }, risk: {},
      evidence: { bullish: ["Price above EMA20"], bearish: ["EMA20 below EMA50", "Downtrend regime"], decisionChecks: ["Bearish score 36 is below EXIT threshold 55"] }, reasons: [] }
  });
  assert.match(output, /Bullish evidence: Price above EMA20/);
  assert.match(output, /Bearish evidence: EMA20 below EMA50; Downtrend regime/);
  assert.match(output, /Decision checks: Bearish score 36 is below EXIT threshold 55/);
  assert.doesNotMatch(output, /Reasons:/);
});
