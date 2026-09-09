import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSignalAiPrompt,
  getVerdictTheme,
} from "../../src/components/StockSignalModal/stockSignalAiPrompt.js";

test("AI Signal Prompt Builder: Synthesizes rich market context and indicators", () => {
  const companyObj = {
    symbol: "RELIANCE",
    label: "Reliance Industries Ltd",
    value: "INE002A01018",
  };
  const instrument = { exchange: "NSE", isin: "INE002A01018" };
  const signal = {
    action: "BUY",
    signal: "BUY",
    marketRegime: "BULLISH_TREND",
    signalStrength: 85,
    bullishScore: 90,
    bearishScore: 10,
    price: 2950.5,
    freshEntryBlocked: false,
    indicators: {
      rsi: 62.4,
      adx: 28.1,
      volumeRatio: 1.85,
      atr: 35.2,
    },
    risk: {
      entry: 2950.5,
      stopLoss: 2897.7,
      target1: 3003.3,
      target2: 3056.1,
    },
    evidence: {
      bullish: ["Price above 20 EMA and 50 EMA", "RSI expanding in bullish zone"],
      bearish: ["Approaching historical resistance at 3000"],
    },
  };
  const performance = {
    found: true,
    candlesElapsed: 3,
    signalPrice: 2900,
    percentChange: 1.74,
    highestPriceSince: 2960,
    maxGainPercent: 2.07,
    lowestPriceSince: 2890,
    maxDrawdownPercent: -0.34,
    statusLabel: "In Target Zone",
  };

  const prompt = buildSignalAiPrompt({
    companyObj,
    instrument,
    signal,
    performance,
  });

  assert.ok(prompt.includes("Reliance Industries Ltd (RELIANCE on NSE)"));
  assert.ok(prompt.includes("Current Price: ₹2950.50"));
  assert.ok(prompt.includes("Engine Signal: BUY"));
  assert.ok(prompt.includes("RSI (14): 62.40"));
  assert.ok(prompt.includes("ADX (14 Trend Strength): 28.10"));
  assert.ok(prompt.includes("Volume Spike vs Average: 1.85x"));
  assert.ok(prompt.includes("Target 1 (1.5R): ₹3003.30"));
  assert.ok(prompt.includes("Price above 20 EMA and 50 EMA"));
  assert.ok(prompt.includes("Signal triggered 3 candles ago at ₹2900.00"));
  assert.ok(prompt.includes("Respond strictly in valid JSON"));
});

test("AI Signal Prompt Builder: Handles minimal or empty signal gracefully", () => {
  const prompt = buildSignalAiPrompt({
    companyObj: { symbol: "TCS" },
    instrument: {},
    signal: {},
    performance: null,
  });

  assert.ok(prompt.includes("TCS (TCS on NSE)"));
  assert.ok(prompt.includes("Current Price: ₹N/A"));
  assert.ok(prompt.includes("Engine Signal: NO_TRADE"));
  assert.ok(prompt.includes("No prior trigger tracking available."));
});

test("AI Signal Verdict Theme: Correctly classifies verdict status colors", () => {
  assert.equal(getVerdictTheme("CONFIRMED_BULLISH"), "theme-bullish");
  assert.equal(getVerdictTheme("CONFIRMED_EXIT"), "theme-bearish");
  assert.equal(getVerdictTheme("HIGH_RISK"), "theme-bearish");
  assert.equal(getVerdictTheme("PROCEED_WITH_CAUTION"), "theme-caution");
  assert.equal(getVerdictTheme("NEUTRAL_WAIT"), "theme-neutral");
  assert.equal(getVerdictTheme("UNKNOWN_SOMETHING"), "theme-neutral");
});
