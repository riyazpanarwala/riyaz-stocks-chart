// src/engine/backtest/nextDayOptionBacktest.js
// ═══════════════════════════════════════════════════════════════════════════
// NIFTY 3:15 PM NEXT-DAY OPTION SIGNAL HISTORICAL BACKTEST ENGINE
// ═══════════════════════════════════════════════════════════════════════════

import {
  generate315NextDayOptionSignal,
  NIFTY_STRIKE_STEP,
} from "../options/nextDayOptionSignalEngine.js";

/**
 * Reconstructs a price-action proxy option chain slice for a historical session
 * when recorded real-time option chain snapshots are not provided.
 *
 * NOTE: This is a price-only proxy. Open interest is approximated from underlying
 * price action and ATM proximity, not actual historical NSE exchange order flow.
 * For production verification, pass recorded historical option-chain snapshots.
 *
 * @param {object} dayCandle { open, high, low, close, volume }
 * @param {object} prevCandle { close }
 * @returns {object}
 */
export function buildSyntheticHistoricalOptionChain(dayCandle, prevCandle) {
  const spot = dayCandle.close;
  const atm = Math.round(spot / NIFTY_STRIKE_STEP) * NIFTY_STRIKE_STEP;
  const dayChangePct = prevCandle?.close ? ((spot - prevCandle.close) / prevCandle.close) * 100 : 0;

  const strikes = [];
  for (let offset = -500; offset <= 500; offset += NIFTY_STRIKE_STEP) {
    strikes.push(atm + offset);
  }

  const rows = strikes.map((strike) => {
    const isAboveAtm = strike > atm;
    const isBelowAtm = strike < atm;
    const distFromAtm = Math.abs(strike - atm);

    // Baseline OI distribution peak near ATM
    const baseOi = Math.max(10_000, Math.round(150_000 - distFromAtm * 180));

    // Skew based on price action
    const ceOi = Math.round(baseOi * (1 + (isAboveAtm ? 0.3 : -0.2) + (dayChangePct < 0 ? 0.4 : -0.2)));
    const peOi = Math.round(baseOi * (1 + (isBelowAtm ? 0.3 : -0.2) + (dayChangePct > 0 ? 0.4 : -0.2)));

    const ceChg = Math.round((ceOi * 0.15) * (dayChangePct < 0 ? 1.5 : -0.8));
    const peChg = Math.round((peOi * 0.15) * (dayChangePct > 0 ? 1.5 : -0.8));

    // Approximate Black-Scholes-like premium for 3-5 DTE
    const intrinsicCE = Math.max(0, spot - strike);
    const intrinsicPE = Math.max(0, strike - spot);
    const timeValue = Math.max(15, Math.round(180 - distFromAtm * 0.25));

    const ceLtp = Math.max(5, Math.round(intrinsicCE + timeValue));
    const peLtp = Math.max(5, Math.round(intrinsicPE + timeValue));

    return {
      strikePrice: strike,
      CE: {
        lastPrice: ceLtp,
        openInterest: Math.max(1000, ceOi),
        changeinOpenInterest: ceChg,
        totalTradedVolume: Math.round(ceOi * 0.8),
        impliedVolatility: 13.5 + (dayChangePct < 0 ? 1.5 : 0),
        bidprice: ceLtp - 1,
        askPrice: ceLtp + 1,
      },
      PE: {
        lastPrice: peLtp,
        openInterest: Math.max(1000, peOi),
        changeinOpenInterest: peChg,
        totalTradedVolume: Math.round(peOi * 0.8),
        impliedVolatility: 14.0 + (dayChangePct > 0 ? -1.0 : 1.5),
        bidprice: peLtp - 1,
        askPrice: peLtp + 1,
      },
    };
  });

  return {
    underlyingValue: spot,
    displayData: rows,
    data: rows,
  };
}

/**
 * Runs a multi-day backtest across historical NIFTY daily candles.
 *
 * @param {Array<{ date: string, open: number, high: number, low: number, close: number, volume: number }>} candles
 * @param {object} [options]
 * @returns {object}
 */
export function runNextDayOptionBacktest(candles, options = {}) {
  if (!Array.isArray(candles) || candles.length < 5) {
    throw new Error("Backtest requires at least 5 historical daily candles.");
  }

  const hasRecordedChains = candles.some((c) => Boolean(c.optionChain));
  const datasetMode = hasRecordedChains
    ? "RECORDED_HISTORICAL_SNAPSHOTS"
    : "PRICE_ACTION_PROXY (Synthetic OI Reconstructed)";

  let totalSignals = 0;
  let ceSignals = 0;
  let peSignals = 0;
  let noTradeSignals = 0;
  let executedTrades = 0;
  let notTriggeredTrades = 0;
  let doNotChaseTrades = 0;

  const tradeLogs = [];
  const monthlyMap = {};

  let peakEquity = 100_000;
  let currentEquity = 100_000;
  let maxDrawdown = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;

  let totalWinPnL = 0;
  let totalLossPnL = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalRiskRewardRecorded = 0;

  // Iterate across trading sessions (from index 1 to length - 2 so we have t-1, t, and t+1)
  for (let i = 1; i < candles.length - 1; i++) {
    const prevCandle = candles[i - 1];
    const currentDay = candles[i];
    const nextDay = candles[i + 1];

    const dateStr = currentDay.date ? new Date(currentDay.date).toISOString().slice(0, 10) : `Day-${i}`;
    const nextDateStr = nextDay.date ? new Date(nextDay.date).toISOString().slice(0, 10) : `Day-${i + 1}`;
    const monthKey = dateStr.slice(0, 7); // YYYY-MM

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
    }

    // 1. Simulate 3:15 PM Analysis at day t (use real recorded chain if present, else synthetic price proxy)
    const optionChain = currentDay.optionChain || buildSyntheticHistoricalOptionChain(currentDay, prevCandle);
    const spotData = {
      spot: currentDay.close,
      open: currentDay.open,
      high: currentDay.high,
      low: currentDay.low,
      prevClose: prevCandle.close,
      vwap: Number(((currentDay.high + currentDay.low + currentDay.close) / 3).toFixed(2)),
    };

    const signalRes = generate315NextDayOptionSignal({
      optionChain,
      spotData,
      analysisDate: dateStr,
    });

    totalSignals++;

    if (signalRes.primarySignal === "NO TRADE") {
      noTradeSignals++;
      continue;
    }

    if (signalRes.primarySignal === "BUY CE") ceSignals++;
    if (signalRes.primarySignal === "BUY PE") peSignals++;

    const isCE = signalRes.primarySignal === "BUY CE";
    const opt = signalRes.recommendedOption;
    const tl = signalRes.tradeLevels;

    if (!opt || !tl || tl.stopLoss <= 0) {
      noTradeSignals++;
      continue;
    }

    // 2. Evaluate Next Day (Day t+1) Execution Rules
    const nextOpen = nextDay.open;
    const nextHigh = nextDay.high;
    const nextLow = nextDay.low;
    const nextClose = nextDay.close;

    const triggerLevel = tl.triggerSpot;
    const initialPremium = opt.ltp;
    const stopLoss = tl.stopLoss;
    const target1 = tl.target1;
    const target2 = tl.target2;
    const delta = opt.isItm ? 0.6 : 0.5;

    // Check GAP / DO NOT CHASE rule:
    // If next day opened > 1.2% past trigger in trade direction, mark as DO NOT CHASE
    const openGapPct = isCE
      ? ((nextOpen - triggerLevel) / triggerLevel) * 100
      : ((triggerLevel - nextOpen) / triggerLevel) * 100;

    if (openGapPct > 0.8) {
      doNotChaseTrades++;
      tradeLogs.push({
        date: dateStr,
        nextDate: nextDateStr,
        signal: signalRes.primarySignal,
        strike: opt.strike,
        result: "DO NOT CHASE",
        reason: `Next-day opening gap (+${openGapPct.toFixed(2)}%) exceeded safe chase limit.`,
        pnl: 0,
        pointsPnL: 0,
        rupeePnL: 0,
      });
      continue;
    }

    // Check Trigger Activation:
    // BUY CE: did next day price reach or sustain above trigger?
    // BUY PE: did next day price reach or sustain below trigger?
    const triggered = isCE ? nextHigh >= triggerLevel : nextLow <= triggerLevel;

    if (!triggered) {
      notTriggeredTrades++;
      tradeLogs.push({
        date: dateStr,
        nextDate: nextDateStr,
        signal: signalRes.primarySignal,
        strike: opt.strike,
        result: "NOT TRIGGERED",
        reason: isCE
          ? `Price never sustained above CE trigger (${triggerLevel})`
          : `Price never sustained below PE trigger (${triggerLevel})`,
        pnl: 0,
        pointsPnL: 0,
        rupeePnL: 0,
      });
      continue;
    }

    executedTrades++;

    // 3. Evaluate Outcome (Stop Loss vs Target Hit)
    // Approximate maximum favorable and adverse option excursions using delta
    const maxSpotGain = isCE ? Math.max(0, nextHigh - triggerLevel) : Math.max(0, triggerLevel - nextLow);
    const maxSpotLoss = isCE ? Math.max(0, triggerLevel - nextLow) : Math.max(0, nextHigh - triggerLevel);

    const maxOptionPremium = initialPremium + maxSpotGain * delta;
    const minOptionPremium = Math.max(1, initialPremium - maxSpotLoss * delta);

    let tradeResult = "LOSS";
    let exitPrice = stopLoss;
    let tradePnL = -(initialPremium - stopLoss);

    const hitStop = minOptionPremium <= stopLoss;
    const hitTarget = maxOptionPremium >= target1;

    if (hitStop && hitTarget) {
      // Conservative risk model: if both stop-loss and target extremes were reached
      // in the same daily candle, treat as stop-loss first to avoid optimistic hindsight bias
      tradeResult = "LOSS";
      exitPrice = stopLoss;
      tradePnL = -(initialPremium - stopLoss);
    } else if (hitTarget) {
      tradeResult = "WIN";
      // Partial to Target 2 or average exit between T1 and T2
      exitPrice = maxOptionPremium >= target2 ? target2 : target1;
      tradePnL = exitPrice - initialPremium;
    } else if (hitStop) {
      tradeResult = "LOSS";
      exitPrice = stopLoss;
      tradePnL = -(initialPremium - stopLoss);
    } else {
      // EOD Exit
      const closeSpotMove = isCE ? nextClose - triggerLevel : triggerLevel - nextClose;
      exitPrice = Math.max(1, Math.round(initialPremium + closeSpotMove * delta));
      tradePnL = exitPrice - initialPremium;
      tradeResult = tradePnL > 0 ? "WIN" : "LOSS";
    }

    // Update Metrics
    const pointsPnL = Number(tradePnL.toFixed(1));
    const lotSize = 65; // NIFTY standard lot size
    const rupeePnL = pointsPnL * lotSize;

    currentEquity += rupeePnL;
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (tradeResult === "WIN") {
      winCount++;
      consecutiveLosses = 0;
      totalWinPnL += rupeePnL;
      monthlyMap[monthKey].wins++;
    } else {
      lossCount++;
      consecutiveLosses++;
      if (consecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = consecutiveLosses;
      totalLossPnL += Math.abs(rupeePnL);
      monthlyMap[monthKey].losses++;
    }

    monthlyMap[monthKey].trades++;
    monthlyMap[monthKey].pnl += rupeePnL;
    totalRiskRewardRecorded += tl.riskRewardRatio;

    tradeLogs.push({
      date: dateStr,
      nextDate: nextDateStr,
      signal: signalRes.primarySignal,
      strike: opt.strike,
      entryZone: tl.entryZone,
      trigger: triggerLevel,
      entryPremium: initialPremium,
      exitPremium: exitPrice,
      pointsPnL,
      rupeePnL,
      result: tradeResult,
    });
  }

  const winRate = executedTrades > 0 ? Number(((winCount / executedTrades) * 100).toFixed(1)) : 0;
  const avgProfit = winCount > 0 ? Number((totalWinPnL / winCount).toFixed(0)) : 0;
  const avgLoss = lossCount > 0 ? Number((totalLossPnL / lossCount).toFixed(0)) : 0;
  const profitFactor = totalLossPnL > 0 ? Number((totalWinPnL / totalLossPnL).toFixed(2)) : (totalWinPnL > 0 ? 99 : 0);
  const avgRiskReward = executedTrades > 0 ? Number((totalRiskRewardRecorded / executedTrades).toFixed(2)) : 0;

  const monthlyPerformance = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    trades: data.trades,
    winRate: data.trades > 0 ? `${((data.wins / data.trades) * 100).toFixed(0)}%` : "0%",
    pnl: `₹${Math.round(data.pnl).toLocaleString("en-IN")}`,
  }));

  return {
    datasetMode,
    isPriceProxy: !hasRecordedChains,
    totalSessions: candles.length - 2,
    totalSignals,
    ceSignals,
    peSignals,
    noTradeSignals,
    executedTrades,
    notTriggeredTrades,
    doNotChaseTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    winRate,
    avgProfit,
    avgLoss,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    profitFactor,
    averageRiskReward: avgRiskReward,
    consecutiveLosses: maxConsecutiveLosses,
    monthlyPerformance,
    tradeLogs: tradeLogs.slice(-20), // Last 20 detailed trades
  };
}
