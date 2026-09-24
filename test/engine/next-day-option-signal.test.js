// test/engine/next-day-option-signal.test.js
import test from "node:test";
import assert from "node:assert/strict";

import {
  validateOptionChainData,
  calculateVWAP,
  determineMarketStructure,
  analyzeOILevels,
  calculateWeightedOptionScore,
  selectOptionToBuy,
  calculateNextDayTradeLevels,
  determineConfidence,
  generate315NextDayOptionSignal,
  formatNextDaySignalFull,
  formatNextDaySignalTelegram,
} from "../../src/engine/options/nextDayOptionSignalEngine.js";

import {
  buildSyntheticHistoricalOptionChain,
  runNextDayOptionBacktest,
} from "../../src/engine/backtest/nextDayOptionBacktest.js";

function createMockOptionChain(spot = 24500, bias = "bullish") {
  const strikes = [24200, 24300, 24400, 24500, 24600, 24700, 24800];
  const isBull = bias === "bullish";

  const rows = strikes.map((strike) => {
    const isAbove = strike >= spot;
    const isBelow = strike <= spot;

    // In bullish: heavy PE OI addition below ATM, CE unwinding above ATM
    const ceOi = isAbove ? (isBull ? 80_000 : 250_000) : 30_000;
    const peOi = isBelow ? (isBull ? 250_000 : 60_000) : 40_000;

    const ceChg = isAbove ? (isBull ? -15_000 : 45_000) : -5_000;
    const peChg = isBelow ? (isBull ? 50_000 : -20_000) : 5_000;

    const ceLtp = Math.max(10, 24500 - strike + 150);
    const peLtp = Math.max(10, strike - 24500 + 150);

    return {
      strikePrice: strike,
      CE: {
        lastPrice: ceLtp,
        change: isBull ? 25 : -25,
        openInterest: ceOi,
        changeinOpenInterest: ceChg,
        totalTradedVolume: isBull ? 120_000 : 180_000,
        impliedVolatility: isBull ? 14.5 : 13.0,
        bidprice: ceLtp - 0.5,
        askPrice: ceLtp + 0.5,
        expiryDate: "26-Sep-2026",
      },
      PE: {
        lastPrice: peLtp,
        change: isBull ? -25 : 25,
        openInterest: peOi,
        changeinOpenInterest: peChg,
        totalTradedVolume: isBull ? 220_000 : 110_000,
        impliedVolatility: isBull ? 13.2 : 15.2,
        bidprice: peLtp - 0.5,
        askPrice: peLtp + 0.5,
        expiryDate: "26-Sep-2026",
      },
    };
  });

  return {
    underlyingValue: spot,
    displayData: rows,
    data: rows,
    expiry: "26-Sep-2026",
  };
}

test("Data Integrity: NEVER fabricates values and returns DATA_UNAVAILABLE when data is missing", () => {
  // Null payload
  const nullRes = generate315NextDayOptionSignal({
    optionChain: null,
    spotData: null,
  });
  assert.equal(nullRes.status, "DATA_UNAVAILABLE");
  assert.equal(nullRes.primarySignal, "NO TRADE");
  assert.equal(nullRes.primarySignalText, "NO TRADE — DATA UNAVAILABLE");

  // Missing spot price
  const missingSpot = generate315NextDayOptionSignal({
    optionChain: { underlyingValue: 0, displayData: [] },
    spotData: { spot: 0 },
  });
  assert.equal(missingSpot.status, "DATA_UNAVAILABLE");

  // Output formatting reflects unavailable data cleanly
  const report = formatNextDaySignalFull(nullRes);
  assert.match(report, /NO TRADE — DATA UNAVAILABLE/);
  assert.match(report, /Never fabricate option-chain values/);
});

test("VWAP Calculation: accurately calculates typical price volume-weighted average", () => {
  const candles = [
    { high: 100, low: 90, close: 95, volume: 1000 }, // TP = 95, TPV = 95,000
    { high: 110, low: 100, close: 105, volume: 2000 }, // TP = 105, TPV = 210,000
  ];
  // Total TPV: 305,000 / Total Vol: 3000 = 101.67
  const vwap = calculateVWAP(candles);
  assert.equal(vwap, 101.67);

  assert.equal(calculateVWAP([]), null);
  assert.equal(calculateVWAP(null), null);
});

test("Market Structure: accurately classifies bullish and bearish intraday formations", () => {
  // Bullish: spot above open, prevClose, VWAP, closing near highs
  const bull = determineMarketStructure({
    spot: 24620,
    open: 24500,
    high: 24630,
    low: 24480,
    prevClose: 24490,
    vwap: 24550,
    intradayCandles: [
      { high: 24520, low: 24490 },
      { high: 24550, low: 24510 },
      { high: 24580, low: 24540 },
      { high: 24600, low: 24560 },
      { high: 24620, low: 24580 },
      { high: 24630, low: 24600 },
    ],
  });
  assert.ok(["STRONG BULLISH", "BULLISH"].includes(bull.structure));
  assert.ok(bull.rationale.some((r) => r.includes("above intraday VWAP")));

  // Bearish: spot below open, prevClose, VWAP, closing near lows
  const bear = determineMarketStructure({
    spot: 24380,
    open: 24500,
    high: 24520,
    low: 24360,
    prevClose: 24510,
    vwap: 24450,
  });
  assert.ok(["STRONG BEARISH", "BEARISH"].includes(bear.structure));
});

test("OI Levels: accurately extracts Support 1/2, Resistance 1/2, PCR, and strike behavior", () => {
  const chain = createMockOptionChain(24500, "bullish");
  const levels = analyzeOILevels(chain.displayData, 24500, 24500);

  assert.equal(levels.support1, 24500);
  assert.equal(levels.resistance1, 24600);
  assert.ok(levels.pcr > 1.0);
  assert.ok(levels.changeOiPcr > 1.0);

  // Buildup classification check: strike 24600 CE has price up + negative OI change -> Short Covering
  assert.equal(levels.strikeBehaviors[24600].CE, "Short Covering");
  // Strike 24500 PE has price down + positive OI change -> Short Buildup (Put writing)
  assert.equal(levels.strikeBehaviors[24500].PE, "Short Build-up");
});

test("Scoring System & BUY CE Rule: triggers BUY CE only when Score >= +60 with >= 3 confirmed factors", () => {
  const chain = createMockOptionChain(24500, "bullish");
  const spotData = {
    spot: 24580,
    open: 24450,
    high: 24590,
    low: 24440,
    prevClose: 24460,
    vwap: 24510,
  };

  const res = generate315NextDayOptionSignal({
    optionChain: chain,
    spotData,
    analysisDate: "24-09-2026",
  });

  assert.equal(res.status, "SUCCESS");
  assert.equal(res.primarySignal, "BUY CE");
  assert.ok(res.finalScore >= 60);
  assert.ok(res.whyReasons.length >= 3);
  assert.ok(res.recommendedOption);
  assert.ok(["NIFTY 24500 CE", "NIFTY 24600 CE"].includes(res.recommendedOption.optionName));
  assert.ok(res.tradeLevels.stopLoss > 0);
  assert.ok(res.tradeLevels.target1 > res.recommendedOption.ltp);
  assert.ok(res.tradeLevels.riskRewardRatio >= 1.5);
  assert.match(res.tradeLevels.entryTrigger, /NIFTY sustains above/i);
});

test("Scoring System & BUY PE Rule: triggers BUY PE only when Score <= -60 with >= 3 confirmed factors", () => {
  const chain = createMockOptionChain(24500, "bearish");
  const spotData = {
    spot: 24390,
    open: 24520,
    high: 24530,
    low: 24380,
    prevClose: 24550,
    vwap: 24460,
  };

  const res = generate315NextDayOptionSignal({
    optionChain: chain,
    spotData,
    analysisDate: "24-09-2026",
  });

  assert.equal(res.status, "SUCCESS");
  assert.equal(res.primarySignal, "BUY PE");
  assert.ok(res.finalScore <= -60);
  assert.ok(res.whyReasons.length >= 3);
  assert.ok(res.recommendedOption);
  assert.match(res.recommendedOption.optionName, /PE$/);
  assert.match(res.tradeLevels.entryTrigger, /NIFTY sustains below/i);
});

test("NO TRADE Rule: triggers NO TRADE when score is within -59 to +59 range", () => {
  // Construct balanced / flat chain
  const strikes = [24400, 24500, 24600];
  const rows = strikes.map((sp) => ({
    strikePrice: sp,
    CE: { lastPrice: 100, change: 0, openInterest: 100_000, changeinOpenInterest: 1000, totalTradedVolume: 50_000 },
    PE: { lastPrice: 100, change: 0, openInterest: 100_000, changeinOpenInterest: 1000, totalTradedVolume: 50_000 },
  }));

  const flatChain = {
    underlyingValue: 24500,
    displayData: rows,
    data: rows,
  };

  const spotData = {
    spot: 24500,
    open: 24500,
    high: 24520,
    low: 24480,
    prevClose: 24500,
    vwap: 24500,
  };

  const res = generate315NextDayOptionSignal({
    optionChain: flatChain,
    spotData,
  });

  assert.equal(res.primarySignal, "NO TRADE");
  assert.ok(res.finalScore >= -59 && res.finalScore <= 59);
});

test("Option Selection: prefers ATM or 1-strike ITM with high volume and tight spreads", () => {
  const rows = [
    {
      strikePrice: 24450, // 1-strike ITM for CE
      CE: { lastPrice: 160, openInterest: 80_000, totalTradedVolume: 250_000, bidprice: 159.5, askPrice: 160.5 },
      PE: { lastPrice: 40, openInterest: 20_000, totalTradedVolume: 10_000, bidprice: 39, askPrice: 41 },
    },
    {
      strikePrice: 24500, // ATM
      CE: { lastPrice: 120, openInterest: 120_000, totalTradedVolume: 400_000, bidprice: 119.5, askPrice: 120.5 },
      PE: { lastPrice: 70, openInterest: 100_000, totalTradedVolume: 150_000, bidprice: 69.5, askPrice: 70.5 },
    },
    {
      strikePrice: 24550, // 1-strike OTM
      CE: { lastPrice: 85, openInterest: 60_000, totalTradedVolume: 90_000, bidprice: 84, askPrice: 86 },
      PE: { lastPrice: 120, openInterest: 70_000, totalTradedVolume: 80_000, bidprice: 119, askPrice: 121 },
    },
  ];

  const selected = selectOptionToBuy({
    signal: "BUY CE",
    rows,
    atm: 24500,
  });

  assert.ok(selected);
  assert.equal(selected.strike, 24500); // Highest volume ATM
  assert.equal(selected.optionName, "NIFTY 24500 CE");
});

test("Formatting: verifies exact Section 12 full report and Section 14 Telegram specifications", () => {
  const chain = createMockOptionChain(24500, "bullish");
  const spotData = {
    spot: 24580,
    open: 24450,
    high: 24590,
    low: 24440,
    prevClose: 24460,
    vwap: 24510,
  };

  const res = generate315NextDayOptionSignal({
    optionChain: chain,
    spotData,
    analysisDate: "24-09-2026",
  });

  const fullReport = formatNextDaySignalFull(res);
  assert.match(fullReport, /^NIFTY NEXT-DAY OPTION SIGNAL/m);
  assert.match(fullReport, /Date: 24-09-2026/);
  assert.match(fullReport, /Analysis Time: 3:15 PM IST/);
  assert.match(fullReport, /PRIMARY SIGNAL:\nBUY CE/);
  assert.match(fullReport, /Option Entry Zone:/);
  assert.match(fullReport, /Risk\/Reward:\n1:/);
  assert.match(fullReport, /INVALIDATION:/);

  const telegramReport = formatNextDaySignalTelegram(res);
  assert.match(telegramReport, /📊 NIFTY NEXT-DAY SETUP/);
  assert.match(telegramReport, /⏰ 3:15 PM IST/);
  assert.match(telegramReport, /🟢 SIGNAL: BUY/);
  assert.match(telegramReport, /⚠️ Invalidation:/);
});

test("Historical Backtest Engine: simulates 3:15 PM signals, next-day execution, and evaluates performance metrics", () => {
  // Generate 25 synthetic trading days
  const candles = [];
  let basePrice = 24000;
  for (let i = 0; i < 25; i++) {
    const trend = i % 4 === 0 ? -40 : 50;
    basePrice += trend;
    candles.push({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      open: basePrice - 20,
      high: basePrice + 60,
      low: basePrice - 40,
      close: basePrice,
      volume: 150_000,
    });
  }

  const metrics = runNextDayOptionBacktest(candles);

  assert.ok(metrics.totalSessions > 0);
  assert.ok(metrics.totalSignals > 0);
  assert.ok(Number.isFinite(metrics.winRate));
  assert.ok(Number.isFinite(metrics.profitFactor));
  assert.ok(metrics.monthlyPerformance.length > 0);
});
