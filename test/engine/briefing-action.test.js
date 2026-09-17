import test from "node:test";
import assert from "node:assert/strict";
import {
  generateFallbackBriefing,
  generateMarketBriefing,
} from "../../src/services/ai/marketBriefingService.js";
import { getDailyMarketBriefingAction } from "../../src/app/actions/marketBriefing.js";

test("generateFallbackBriefing: generates valid structured briefing conforming to schema", () => {
  const aggregated = {
    total: 3,
    breadth: { bullishPct: 67, neutralPct: 33, bearishPct: 0 },
    buyCandidates: [
      {
        symbol: "RELIANCE",
        name: "Reliance Industries",
        price: 3000,
        regime: "BULLISH_TREND",
        strength: 88,
        risk: { entry: 3000, stopLoss: 2940, target1: 3100 },
        evidence: ["EMA Bullish Alignment", "RSI Momentum"],
      },
      {
        symbol: "TCS",
        name: "Tata Consultancy Services",
        price: 4000,
        regime: "BULLISH_TREND",
        strength: 82,
        risk: { entry: 4000, stopLoss: 3920, target1: 4120 },
        evidence: ["52-Week High Breakout"],
      },
    ],
    exitCandidates: [
      {
        symbol: "INFY",
        name: "Infosys Ltd",
        price: 1800,
        risks: ["Loss of 50 EMA"],
      },
    ],
  };

  const briefing = generateFallbackBriefing(aggregated, "2026-09-17");

  assert.equal(briefing.marketSentiment, "BULLISH");
  assert.ok(briefing.sentimentHeadline.includes("Bullish"));
  assert.ok(briefing.executiveSummary.length > 20);

  assert.equal(briefing.topSwingSetups.length, 2);
  assert.equal(briefing.topSwingSetups[0].symbol, "RELIANCE");
  assert.ok(briefing.topSwingSetups[0].entryZone.includes("₹"));
  assert.ok(briefing.topSwingSetups[0].stopLoss.includes("₹"));
  assert.ok(briefing.topSwingSetups[0].target.includes("₹"));
  assert.ok(briefing.topSwingSetups[0].rationale.includes("EMA Bullish Alignment"));

  assert.equal(briefing.riskWatchlist.length, 1);
  assert.equal(briefing.riskWatchlist[0].symbol, "INFY");

  assert.ok(briefing.tacticalGameplan.length >= 2);
});

test("generateFallbackBriefing: accurately classifies bearish distribution regime and suppresses swing setups", () => {
  const aggregated = {
    total: 4,
    breadth: { bullishPct: 0, neutralPct: 25, bearishPct: 75 },
    buyCandidates: [
      {
        symbol: "ISOLATED_LONG",
        name: "Outlier Stock",
        price: 500,
        regime: "BULLISH_TREND",
        strength: 70,
        risk: { entry: 500, stopLoss: 485, target1: 530 },
      },
    ],
    exitCandidates: [
      { symbol: "SBIN", risks: ["Breakdown below 200 SMA"] },
      { symbol: "HDFCBANK", risks: ["RSI Bearish Divergence"] },
    ],
  };

  const briefing = generateFallbackBriefing(aggregated);
  assert.equal(briefing.marketSentiment, "BEARISH_CORRECTION");
  assert.equal(briefing.topSwingSetups.length, 0);
  assert.ok(briefing.executiveSummary.includes("under bearish or distribution conditions"));
  assert.equal(briefing.riskWatchlist.length, 2);
});

test("generateMarketBriefing: falls back gracefully when allowFallback is true and Gemini fails", async () => {
  const failingClient = {
    models: {
      generateContent: async () => {
        throw new Error("Simulated Gemini Quota Exceeded 429");
      },
    },
  };

  const mockAnalyzer = async (sym) => ({
    symbol: sym,
    signal: {
      signal: "BUY",
      action: "BUY",
      marketRegime: "BULLISH_TREND",
      signalStrength: 80,
      price: 2500,
      risk: { entry: 2500, stopLoss: 2450, target1: 2600 },
      evidence: { bullish: ["Breakout"] },
    },
  });

  const result = await generateMarketBriefing({
    symbols: ["BEL", "MARUTI"],
    client: failingClient,
    analyzer: mockAnalyzer,
    allowFallback: true,
  });

  assert.equal(result.source, "fallback");
  assert.ok(result.briefing);
  assert.ok(result.briefing.topSwingSetups.length > 0);
  assert.ok(result.markdown.includes("Indian Markets Daily Briefing"));
});

test("getDailyMarketBriefingAction: enforces authentication gate when unauthenticated", async () => {
  // In test runner with no session cookie set, checkScreenerAccessAction returns false
  const res = await getDailyMarketBriefingAction();
  assert.equal(res.success, false);
  assert.equal(res.authenticated, false);
  assert.ok(res.error.includes("Authentication required"));
});
