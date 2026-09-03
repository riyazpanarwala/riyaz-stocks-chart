import test from "node:test";
import assert from "node:assert/strict";
import { candles } from "./helpers.js";
import { trackSignalPerformance, generateSignal } from "../../src/engine/strategy/signalEngine.js";
import { formatCompactAnalysis } from "../../src/engine/quick/analyzeStock.js";

test("trackSignalPerformance returns null for insufficient candle count", () => {
  const shortCandles = candles(50, 1);
  const result = trackSignalPerformance(shortCandles);
  assert.equal(result, null);
});

test("trackSignalPerformance reports found: false when pure downtrend has no trade history", () => {
  const bearCandles = candles(300, -1);
  const result = trackSignalPerformance(bearCandles, { lookbackLimit: 50 });
  assert.equal(result.found, false);
  assert.match(result.message, /No BUY or EXIT signals found/);
});

test("trackSignalPerformance identifies BUY trigger candle, price movement, and peak excursion", () => {
  const bullCandles = candles(320, 1);
  const result = trackSignalPerformance(bullCandles);

  assert.equal(result.found, true);
  assert.equal(result.signalType, "BUY");
  assert.ok(typeof result.candlesElapsed === "number");
  assert.ok(result.candlesElapsed >= 0);
  assert.ok(result.triggerTimestamp);
  assert.ok(result.signalPrice > 0);
  assert.ok(result.currentPrice > 0);

  // Math verification: priceChange = currentPrice - signalPrice
  const expectedChange = Number((result.currentPrice - result.signalPrice).toFixed(4));
  assert.equal(result.priceChange, expectedChange);

  // Math verification: percentChange = ((currentPrice - signalPrice) / signalPrice) * 100
  const expectedPct = Number((((result.currentPrice - result.signalPrice) / result.signalPrice) * 100).toFixed(4));
  assert.equal(result.percentChange, expectedPct);

  // Peak excursion verification: highestPriceSince >= signalPrice
  assert.ok(result.highestPriceSince >= result.signalPrice);
  assert.ok(result.maxGainPercent >= 0);

  // Drawdown verification: lowestPriceSince <= highestPriceSince
  assert.ok(result.lowestPriceSince <= result.highestPriceSince);
  assert.ok(result.status);
  assert.ok(result.statusLabel);
  assert.ok(result.guidance);
});

test("trackSignalPerformance identifies fresh signal on 0 candles elapsed", () => {
  // Use a bull series and evaluate at the exact index where BUY was triggered
  const bullCandles = candles(250, 1);
  const fullResult = trackSignalPerformance(bullCandles);
  if (fullResult.found) {
    const atTriggerCandles = bullCandles.slice(0, fullResult.triggerIndex + 1);
    const triggerPerf = trackSignalPerformance(atTriggerCandles);
    assert.equal(triggerPerf.candlesElapsed, 0);
    assert.equal(triggerPerf.status, "FRESH_SIGNAL");
    assert.equal(triggerPerf.statusLabel, "Fresh Signal");
    assert.match(triggerPerf.guidance, /Fresh entry window/i);
  }
});

test("formatCompactAnalysis includes signal performance summary when available", () => {
  const mockResult = {
    instrument: { symbol: "TCS" },
    timeframe: "1d",
    signal: {
      timestamp: "2026-09-02T18:30:00.000Z",
      signal: "BUY",
      action: "ENTER_LONG",
      price: 3500.0,
      marketRegime: "STRONG_UPTREND",
      bullishScore: 85,
      bearishScore: 10,
      signalStrength: 75,
      indicators: { rsi: 62.5, adx: 28.0, volumeRatio: 1.4 },
      risk: { entry: 3500.0, stopLoss: 3400.0, target1: 3650.0, target2: 3800.0 },
      evidence: { bullish: ["Price above EMA20", "RSI in bullish momentum zone"], bearish: [] }
    },
    signalPerformance: {
      found: true,
      signalType: "BUY",
      status: "IN_ZONE",
      statusLabel: "In Entry Zone",
      candlesElapsed: 3,
      triggerTimestamp: "2026-08-28T18:30:00.000Z",
      signalPrice: 3420.0,
      currentPrice: 3500.0,
      priceChange: 80.0,
      percentChange: 2.34,
      highestPriceSince: 3520.0,
      maxGainPercent: 2.92,
      lowestPriceSince: 3410.0,
      maxDrawdownPercent: -0.29,
      guidance: "Price is hovering near entry (+2.34%). Trade setup remains valid."
    }
  };

  const output = formatCompactAnalysis(mockResult);
  assert.match(output, /Latest BUY Trigger: .* \(3 candles ago\) @ ₹3420\.00/);
  assert.match(output, /Move since BUY: \+₹80\.00 \(\+2\.34%\) \| Peak: ₹3520\.00 \(\+2\.92%\) \| Low: ₹3410\.00 \(-0\.29%\)/);
  assert.match(output, /Trigger Status: \[In Entry Zone\]/);
});

test("trackSignalPerformance tracks closed trades when a bull run reverses to bear", () => {
  // 240 bull candles followed by 40 bear candles
  const prefix = candles(240, 1);
  const reversal = [];
  let prev = prefix[prefix.length - 1].close;
  for (let i = 0; i < 40; i++) {
    const close = prev - 1.5;
    reversal.push({
      timestamp: new Date(Date.UTC(2025, 0, i + 1)).toISOString(),
      open: prev,
      high: prev + 0.2,
      low: close - 0.5,
      close,
      volume: 1200,
      openInterest: null
    });
    prev = close;
  }
  const fullSeries = [...prefix, ...reversal];
  const result = trackSignalPerformance(fullSeries, { lookbackLimit: 60 });

  assert.equal(result.found, true);
  assert.equal(result.signalType, "EXIT");
  assert.ok(result.candlesElapsed >= 0);
  assert.ok(result.signalPrice > 0);
  assert.ok(result.status);
  assert.ok(result.guidance);
  if (result.closedTrade) {
    assert.ok(result.closedTrade.buyPrice > 0);
    assert.ok(result.closedTrade.exitPrice > 0);
    assert.ok(typeof result.closedTrade.returnPercent === "number");
  }
});

test("formatCompactAnalysis formats EXIT trigger and prior trade when available", () => {
  const mockExitResult = {
    instrument: { symbol: "JPPOWER" },
    timeframe: "1d",
    signal: {
      timestamp: "2026-09-02T18:30:00.000Z",
      signal: "NO_TRADE",
      action: "AVOID",
      price: 16.18,
      marketRegime: "DOWNTREND",
      bullishScore: 0,
      bearishScore: 65,
      signalStrength: 65,
      indicators: { rsi: 28.4, adx: 12.9, volumeRatio: 0.9 },
      evidence: { bullish: [], bearish: ["Downtrend regime", "Breakdown"] }
    },
    signalPerformance: {
      found: true,
      signalType: "EXIT",
      status: "STOP_LOSS_CLOSED",
      statusLabel: "Closed by Stop Loss",
      candlesElapsed: 67,
      triggerTimestamp: "2026-06-01T18:30:00.000Z",
      signalPrice: 21.07,
      currentPrice: 16.18,
      priceChange: -4.89,
      percentChange: -23.22,
      highestPriceSince: 21.99,
      lowestPriceSince: 16.09,
      closedTrade: {
        buyTimestamp: "2026-05-27T18:30:00.000Z",
        buyPrice: 22.87,
        exitTimestamp: "2026-06-01T18:30:00.000Z",
        exitPrice: 21.07,
        returnPercent: -7.86,
        reason: "STOP_LOSS"
      },
      guidance: "Trade was closed at stop loss (₹21.07). Avoid re-entry without a fresh confirmed BUY signal."
    }
  };

  const output = formatCompactAnalysis(mockExitResult);
  assert.match(output, /Latest EXIT \/ Close Trigger:/);
  assert.match(output, /Move since EXIT: -₹4\.89 \(-23\.22%\)/);
  assert.match(output, /Trigger Status: \[Closed by Stop Loss\]/);
  assert.match(output, /Prior Trade: BUY .* @ ₹22\.87 → Closed on .* @ ₹21\.07/);
});
