const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const sampleStd = (values) => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
};
const durationDays = (from, to) => Math.max(0, (Date.parse(to) - Date.parse(from)) / 86_400_000);

function streaks(trades) {
  let maxWins = 0, maxLosses = 0, wins = 0, losses = 0;
  for (const trade of trades) {
    if (trade.netPnl > 0) { wins++; losses = 0; maxWins = Math.max(maxWins, wins); }
    else if (trade.netPnl < 0) { losses++; wins = 0; maxLosses = Math.max(maxLosses, losses); }
    else { wins = 0; losses = 0; }
  }
  return { maximumConsecutiveWins: maxWins, maximumConsecutiveLosses: maxLosses };
}

function drawdownMetrics(equityCurve) {
  let peak = -Infinity, maxDrawdown = 0, currentEpisode = [], episodes = [];
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;
    point.drawdown = drawdown;
    if (drawdown > 0) currentEpisode.push(drawdown);
    else if (currentEpisode.length) { episodes.push(Math.max(...currentEpisode)); currentEpisode = []; }
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  if (currentEpisode.length) episodes.push(Math.max(...currentEpisode));
  return { maximumDrawdown: maxDrawdown, averageDrawdown: mean(episodes) };
}

export function calculateBacktestMetrics({ trades, equityCurve, initialCapital, annualizationFactor = 252 }) {
  const winners = trades.filter((t) => t.netPnl > 0), losers = trades.filter((t) => t.netPnl < 0);
  const grossProfit = winners.reduce((sum, t) => sum + t.netPnl, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.netPnl, 0));
  const endingEquity = equityCurve.at(-1)?.equity ?? initialCapital;
  const totalReturn = endingEquity / initialCapital - 1;
  const elapsedDays = equityCurve.length > 1 ? durationDays(equityCurve[0].timestamp, equityCurve.at(-1).timestamp) : 0;
  const cagr = elapsedDays >= 1 && endingEquity > 0 ? (endingEquity / initialCapital) ** (365.25 / elapsedDays) - 1 : null;
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) if (equityCurve[i - 1].equity !== 0) returns.push(equityCurve[i].equity / equityCurve[i - 1].equity - 1);
  const deviation = sampleStd(returns), downsideDeviation = Math.sqrt(mean(returns.filter((r) => r < 0).map((r) => r ** 2)));
  const averageReturn = mean(returns);
  const { maximumDrawdown, averageDrawdown } = drawdownMetrics(equityCurve);
  return {
    totalTrades: trades.length, winningTrades: winners.length, losingTrades: losers.length,
    winRate: trades.length ? winners.length / trades.length : 0,
    averageProfit: mean(winners.map((t) => t.netPnl)), averageLoss: mean(losers.map((t) => t.netPnl)),
    expectancy: mean(trades.map((t) => t.netPnl)), totalReturn, cagr,
    maximumDrawdown, averageDrawdown, ...streaks(trades),
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    profitFactorUndefinedReason: grossLoss === 0 && grossProfit > 0 ? 'NO_LOSING_TRADES' : null,
    sharpeRatio: deviation > 0 ? averageReturn / deviation * Math.sqrt(annualizationFactor) : null,
    sortinoRatio: downsideDeviation > 0 ? averageReturn / downsideDeviation * Math.sqrt(annualizationFactor) : null,
    averageHoldingPeriodDays: mean(trades.map((t) => t.holdingDurationDays)),
    largestWinningTrade: winners.length ? Math.max(...winners.map((t) => t.netPnl)) : 0,
    largestLosingTrade: losers.length ? Math.min(...losers.map((t) => t.netPnl)) : 0,
    totalTransactionCosts: trades.reduce((sum, t) => sum + t.transactionCosts, 0),
    target1HitRate: trades.length ? trades.filter((t) => t.target1Hit).length / trades.length : 0,
    target2HitRate: trades.length ? trades.filter((t) => t.target2Hit).length / trades.length : 0,
    stopLossHitRate: trades.length ? trades.filter((t) => t.exitReason === 'STOP_LOSS').length / trades.length : 0,
    initialCapital, endingEquity
  };
}
