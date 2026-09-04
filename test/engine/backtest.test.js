import test from "node:test";
import assert from "node:assert/strict";
import { runBacktest } from "../../src/engine/backtest/backtestEngine.js";
import { mergeBacktestConfig } from "../../src/engine/backtest/defaultConfig.js";
import { applySlippage, calculateTransactionCosts } from "../../src/engine/backtest/costs.js";
import { calculateBacktestMetrics } from "../../src/engine/backtest/metrics.js";

function bars(values) {
  return values.map((value, index) => ({
    timestamp: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
    open: value.open, high: value.high ?? Math.max(value.open, value.close ?? value.open) + 1, low: value.low ?? Math.min(value.open, value.close ?? value.open) - 1,
    close: value.close ?? value.open, volume: 1000, openInterest: null
  }));
}

function scripted(signals) {
  return (_candles, index, { positionState }) => ({
    timestamp: _candles[index].timestamp, index, status: 'READY',
    signal: signals[index] ?? (positionState === 'LONG' ? 'HOLD' : 'NO_TRADE'),
    action: 'TEST', indicators: { atr: 2 }, bullishScore: 0, bearishScore: 0
  });
}

test("signals execute on the next candle open, never the signal close", () => {
  const input = bars([{ open: 90, close: 95 }, { open: 100 }, { open: 105 }, { open: 103 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY', 'HOLD', 'EXIT']), forceCloseAtEnd: false });
  assert.equal(result.trades[0].entryIndex, 1); assert.equal(result.trades[0].entryPrice, 100);
  assert.equal(result.trades[0].exitIndex, 3); assert.equal(result.trades[0].exitPrice, 103); assert.equal(result.trades[0].exitReason, 'EXIT_SIGNAL');
});

test("gap through stop fills at the next open", () => {
  const input = bars([{ open: 90 }, { open: 100, low: 99 }, { open: 90, high: 92, low: 88 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY']), forceCloseAtEnd: false });
  assert.equal(result.trades[0].exitPrice, 90); assert.equal(result.trades[0].exitReason, 'STOP_LOSS');
});

test("target 1 is tracked and target 2 closes the full position", () => {
  const input = bars([{ open: 90 }, { open: 100, high: 110, low: 99, close: 108 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY']) });
  assert.equal(result.trades[0].exitReason, 'TARGET_2'); assert.equal(result.trades[0].exitPrice, 109);
  assert.equal(result.trades[0].target1Hit, true); assert.equal(result.metrics.target2HitRate, 1);
});

test("ambiguous same-bar stop and target defaults to conservative stop-first", () => {
  const input = bars([{ open: 90 }, { open: 100, high: 110, low: 96, close: 100 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY']) });
  assert.equal(result.trades[0].exitReason, 'STOP_LOSS'); assert.equal(result.trades[0].exitPrice, 97);
  assert.equal(result.trades[0].target1Hit, false);
});

test("target-first policy is explicit and configurable", () => {
  const input = bars([{ open: 90 }, { open: 100, high: 110, low: 96, close: 100 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY']), sameBarExitPriority: 'TARGET_FIRST' });
  assert.equal(result.trades[0].exitReason, 'TARGET_2'); assert.equal(result.trades[0].exitPrice, 109);
});

test("slippage worsens long entries and exits", () => {
  assert.equal(applySlippage(100, 'BUY', 10), 100.1); assert.equal(applySlippage(100, 'SELL', 10), 99.9);
});

test("cost model itemizes brokerage, STT, exchange, SEBI, GST and stamp duty", () => {
  const costs = calculateTransactionCosts({ side: 'BUY', price: 100, quantity: 10 }, {
    brokerageRate: 0.001, brokerageMaxPerOrder: 20, sttBuyRate: 0.0001, sttSellRate: 0.0002,
    exchangeRate: 0.00005, sebiRate: 0.000001, gstRate: 0.18, stampDutyBuyRate: 0.00015, fixedPerOrder: 1
  });
  assert.equal(costs.brokerage, 1); assert.equal(costs.stt, 0.1); assert.ok(Math.abs(costs.total - 2.49018) < 1e-9);
});

test("insufficient cash rejects entry without creating a trade", () => {
  const input = bars([{ open: 90 }, { open: 100 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY']), initialCapital: 50, forceCloseAtEnd: false });
  assert.equal(result.trades.length, 0); assert.equal(result.orders[0].status, 'REJECTED');
});

test("open trade is closed at final close when forceCloseAtEnd is enabled", () => {
  const input = bars([{ open: 90 }, { open: 100, close: 102, high: 103, low: 99 }]);
  const result = runBacktest(input, { signalGenerator: scripted(['BUY']) });
  assert.equal(result.trades[0].exitReason, 'END_OF_DATA'); assert.equal(result.trades[0].exitPrice, 102);
});

test("metrics handle a zero-trade backtest without NaN", () => {
  const equityCurve = [{ timestamp: '2024-01-01T00:00:00Z', equity: 100 }, { timestamp: '2024-01-02T00:00:00Z', equity: 100 }];
  const metrics = calculateBacktestMetrics({ trades: [], equityCurve, initialCapital: 100 });
  assert.equal(metrics.totalTrades, 0); assert.equal(metrics.totalReturn, 0); assert.equal(metrics.profitFactor, 0); assert.equal(metrics.sharpeRatio, null);
});

test("metrics calculate win/loss, expectancy, drawdown, streak and hit rates", () => {
  const trades = [
    { netPnl: 20, holdingDurationDays: 2, transactionCosts: 2, target1Hit: true, target2Hit: true, exitReason: 'TARGET_2' },
    { netPnl: -10, holdingDurationDays: 1, transactionCosts: 2, target1Hit: false, target2Hit: false, exitReason: 'STOP_LOSS' }
  ];
  const equityCurve = [100, 120, 108, 110].map((equity, i) => ({ timestamp: new Date(Date.UTC(2024, 0, i + 1)).toISOString(), equity }));
  const m = calculateBacktestMetrics({ trades, equityCurve, initialCapital: 100 });
  assert.equal(m.totalTrades, 2); assert.equal(m.winRate, 0.5); assert.equal(m.expectancy, 5);
  assert.equal(m.profitFactor, 2); assert.equal(m.maximumDrawdown, 0.1);
  assert.equal(m.maximumConsecutiveWins, 1); assert.equal(m.maximumConsecutiveLosses, 1);
  assert.equal(m.target1HitRate, 0.5); assert.equal(m.target2HitRate, 0.5); assert.equal(m.stopLossHitRate, 0.5);
});

test("backtest prefix is unchanged when unrelated future candles are appended", () => {
  const prefix = bars([{ open: 90 }, { open: 100 }, { open: 101 }, { open: 102 }]);
  const options = { signalGenerator: scripted(['BUY']), forceCloseAtEnd: false };
  const before = runBacktest(prefix, options);
  const after = runBacktest([...prefix, ...bars([{ open: 103 }, { open: 104 }]).map((c, i) => ({ ...c, timestamp: new Date(Date.UTC(2025, 0, i + 1)).toISOString() }))], options);
  assert.deepEqual(after.equityCurve.slice(0, prefix.length), before.equityCurve);
  assert.deepEqual(after.signals.slice(0, prefix.length), before.signals);
});

test("invalid negative cost assumptions are rejected", () => {
  assert.throws(() => runBacktest(bars([{ open: 90 }, { open: 100 }]), { costs: { sttSellRate: -0.1 } }), /non-negative/);
});

test("breakeven trailing stop moves stop loss to entry price when target 1 is touched", () => {
  const input = bars([
    { open: 90 },
    { open: 100, high: 106, low: 99, close: 104 },
    { open: 101, high: 102, low: 99, close: 100 }
  ]);
  const result = runBacktest(input, {
    signalGenerator: scripted(['BUY']),
    trailingStop: 'BREAKEVEN_AT_TARGET1',
    forceCloseAtEnd: false
  });
  assert.equal(result.trades[0].target1Hit, true);
  assert.equal(result.trades[0].exitReason, 'STOP_LOSS');
  assert.equal(result.trades[0].exitPrice, 100);
  assert.equal(result.trades[0].netPnl, 0);
});

test("non-finite numeric configuration values are rejected", () => {
  assert.throws(() => mergeBacktestConfig({ initialCapital: Infinity }), /positive finite number/);
  assert.throws(() => mergeBacktestConfig({ initialCapital: NaN }), /positive finite number/);
  assert.throws(() => mergeBacktestConfig({ quantity: 1.5 }), /positive integer/);
  assert.throws(() => mergeBacktestConfig({ slippageBps: NaN }), /non-negative finite number/);
  assert.throws(() => mergeBacktestConfig({ annualizationFactor: Infinity }), /positive finite number/);
});

test("breakeven trailing stop exits on same bar when sameBarExitPriority is TARGET_FIRST", () => {
  const input = bars([
    { open: 90 },
    { open: 100, high: 102, low: 98, close: 100 },
    { open: 101, high: 106, low: 99, close: 101 }
  ]);
  const result = runBacktest(input, {
    signalGenerator: scripted(['BUY']),
    trailingStop: 'BREAKEVEN_AT_TARGET1',
    sameBarExitPriority: 'TARGET_FIRST',
    forceCloseAtEnd: false
  });
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].target1Hit, true);
  assert.equal(result.trades[0].exitReason, 'STOP_LOSS');
  assert.equal(result.trades[0].exitPrice, 100);
  assert.equal(result.trades[0].exitIndex, 2);
});
