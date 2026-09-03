import { validateCandles } from "../data/candleValidator.js";
import { calculateAtrRisk } from "../risk/atrRisk.js";
import { mergeStrategyConfig } from "../strategy/defaultConfig.js";
import { generateSignalAtIndex } from "../strategy/signalEngine.js";
import { mergeBacktestConfig } from "./defaultConfig.js";
import { applySlippage, calculateTransactionCosts } from "./costs.js";
import { calculateBacktestMetrics } from "./metrics.js";

const daysBetween = (from, to) => Math.max(0, (Date.parse(to) - Date.parse(from)) / 86_400_000);
const round = (value) => Number(value.toFixed(6));

export function runBacktest(candles, options = {}) {
  validateCandles(candles);
  if (candles.length < 2) throw new Error("Backtest requires at least two candles");
  const { strategyConfig: strategyOverrides, signalGenerator = generateSignalAtIndex, ...backtestOverrides } = options;
  const config = mergeBacktestConfig(backtestOverrides);
  const strategyConfig = mergeStrategyConfig(strategyOverrides);
  let cash = config.initialCapital, position = null, pendingOrder = null;
  const trades = [], equityCurve = [], signals = [], orders = [];

  const closePosition = ({ candle, index, rawPrice, reason, signalIndex = null }) => {
    const fillPrice = applySlippage(rawPrice, 'SELL', config.slippageBps);
    const exitCosts = calculateTransactionCosts({ side: 'SELL', price: fillPrice, quantity: position.quantity }, config.costs);
    cash += fillPrice * position.quantity - exitCosts.total;
    const grossPnl = (fillPrice - position.entryPrice) * position.quantity;
    const transactionCosts = position.entryCosts.total + exitCosts.total;
    const netPnl = grossPnl - transactionCosts;
    const trade = {
      direction: 'LONG', quantity: position.quantity,
      entryIndex: position.entryIndex, entrySignalIndex: position.entrySignalIndex,
      entryTimestamp: position.entryTimestamp, entryPrice: round(position.entryPrice),
      exitIndex: index, exitSignalIndex: signalIndex, exitTimestamp: candle.timestamp, exitPrice: round(fillPrice),
      stopLoss: round(position.stopLoss), target1: round(position.target1), target2: round(position.target2),
      grossPnl: round(grossPnl), netPnl: round(netPnl), pnlPercent: round(netPnl / (position.entryPrice * position.quantity)),
      rMultiple: round(netPnl / position.initialRiskAmount), holdingCandles: index - position.entryIndex,
      holdingDurationDays: round(daysBetween(position.entryTimestamp, candle.timestamp)), exitReason: reason,
      target1Hit: position.target1Hit, target2Hit: reason === 'TARGET_2',
      entryCosts: position.entryCosts, exitCosts, transactionCosts: round(transactionCosts)
    };
    trades.push(trade);
    orders.push({ side: 'SELL', index, timestamp: candle.timestamp, fillPrice: round(fillPrice), quantity: position.quantity, reason, costs: exitCosts });
    position = null;
  };

  const openPosition = ({ candle, index, order }) => {
    const fillPrice = applySlippage(candle.open, 'BUY', config.slippageBps);
    const entryCosts = calculateTransactionCosts({ side: 'BUY', price: fillPrice, quantity: config.quantity }, config.costs);
    const requiredCash = fillPrice * config.quantity + entryCosts.total;
    if (requiredCash > cash) {
      orders.push({ side: 'BUY', index, timestamp: candle.timestamp, status: 'REJECTED', reason: 'INSUFFICIENT_CASH', requiredCash, availableCash: cash });
      return;
    }
    const risk = calculateAtrRisk(fillPrice, order.signal.indicators.atr, strategyConfig.risk);
    if (risk.riskPerShare == null || risk.stopLoss <= 0) {
      orders.push({ side: 'BUY', index, timestamp: candle.timestamp, status: 'REJECTED', reason: 'INVALID_RISK_LEVELS' });
      return;
    }
    cash -= requiredCash;
    position = {
      quantity: config.quantity, entryIndex: index, entrySignalIndex: order.signalIndex,
      entryTimestamp: candle.timestamp, entryPrice: fillPrice, entryCosts,
      stopLoss: risk.stopLoss, target1: risk.target1, target2: risk.target2,
      initialRiskAmount: risk.riskPerShare * config.quantity, target1Hit: false
    };
    orders.push({ side: 'BUY', index, signalIndex: order.signalIndex, timestamp: candle.timestamp, fillPrice: round(fillPrice), quantity: config.quantity, status: 'FILLED', costs: entryCosts });
  };

  for (let index = 0; index < candles.length; index++) {
    const candle = candles[index];

    if (pendingOrder) {
      if (pendingOrder.type === 'ENTER' && !position) openPosition({ candle, index, order: pendingOrder });
      else if (pendingOrder.type === 'EXIT' && position) closePosition({ candle, index, rawPrice: candle.open, reason: 'EXIT_SIGNAL', signalIndex: pendingOrder.signalIndex });
      pendingOrder = null;
    }

    if (position) {
      const gapStop = candle.open <= position.stopLoss;
      const gapTarget = candle.open >= position.target2;
      const touchesStop = candle.low <= position.stopLoss;
      const touchesTarget2 = candle.high >= position.target2;
      const both = touchesStop && touchesTarget2;
      if (gapStop) closePosition({ candle, index, rawPrice: candle.open, reason: 'STOP_LOSS' });
      else if (gapTarget) { position.target1Hit = true; closePosition({ candle, index, rawPrice: candle.open, reason: 'TARGET_2' }); }
      else if (both) {
        if (config.sameBarExitPriority === 'STOP_FIRST') closePosition({ candle, index, rawPrice: position.stopLoss, reason: 'STOP_LOSS' });
        else { position.target1Hit = true; closePosition({ candle, index, rawPrice: position.target2, reason: 'TARGET_2' }); }
      } else if (touchesStop) closePosition({ candle, index, rawPrice: position.stopLoss, reason: 'STOP_LOSS' });
      else if (touchesTarget2) { position.target1Hit = true; closePosition({ candle, index, rawPrice: position.target2, reason: 'TARGET_2' }); }
      else if (candle.high >= position.target1) {
        position.target1Hit = true;
        if (config.trailingStop === 'BREAKEVEN_AT_TARGET1') {
          position.stopLoss = Math.max(position.stopLoss, position.entryPrice);
        }
      }
    }

    const equity = cash + (position ? position.quantity * candle.close : 0);
    equityCurve.push({ index, timestamp: candle.timestamp, cash: round(cash), positionValue: round(position ? position.quantity * candle.close : 0), equity: round(equity) });

    const signal = signalGenerator(candles, index, { config: strategyConfig, positionState: position ? 'LONG' : 'FLAT' });
    signals.push(signal);
    if (index < candles.length - 1) {
      if (!position && signal.signal === 'BUY') pendingOrder = { type: 'ENTER', signalIndex: index, signal };
      else if (position && signal.signal === 'EXIT') pendingOrder = { type: 'EXIT', signalIndex: index, signal };
    }
  }

  if (position && config.forceCloseAtEnd) {
    const index = candles.length - 1, candle = candles[index];
    closePosition({ candle, index, rawPrice: candle.close, reason: 'END_OF_DATA' });
    equityCurve[index] = { ...equityCurve[index], cash: round(cash), positionValue: 0, equity: round(cash) };
  }

  const metrics = calculateBacktestMetrics({ trades, equityCurve, initialCapital: config.initialCapital, annualizationFactor: config.annualizationFactor });
  return {
    metadata: {
      executionConvention: 'Signal on candle N close; execute at candle N+1 open',
      intrabarConvention: `${config.sameBarExitPriority}; T1 is tracked, full exit occurs at T2, stop, exit signal, or end of data`,
      startTimestamp: candles[0].timestamp, endTimestamp: candles.at(-1).timestamp,
      candleCount: candles.length, strategyConfig, backtestConfig: config
    },
    metrics, trades, equityCurve, signals, orders, openPosition: position
  };
}
