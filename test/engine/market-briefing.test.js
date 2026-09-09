import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateMarketData,
  buildMarketBriefingPrompt,
  formatBriefingMarkdown,
  generateMarketBriefing,
} from "../../src/services/ai/marketBriefingService.js";

test("Market Briefing: aggregateMarketData calculates breadth and categorizes candidates", () => {
  const sampleScanResults = [
    {
      symbol: "RELIANCE",
      instrument: { name: "Reliance Industries Ltd", symbol: "RELIANCE" },
      signal: {
        signal: "BUY",
        action: "BUY",
        marketRegime: "BULLISH_TREND",
        signalStrength: 85,
        bullishScore: 90,
        price: 2950,
        indicators: { rsi: 65, adx: 28, volumeRatio: 1.5, atr: 30 },
        risk: { entry: 2950, stopLoss: 2890, target1: 3040 },
        evidence: { bullish: ["EMA Bullish Alignment", "RSI Momentum"] },
      },
    },
    {
      symbol: "TCS",
      instrument: { name: "Tata Consultancy Services", symbol: "TCS" },
      signal: {
        signal: "EXIT",
        action: "EXIT_LONG",
        marketRegime: "DOWNTREND",
        signalStrength: 40,
        bearishScore: 75,
        price: 3800,
        evidence: { bearish: ["Breakdown below 50 EMA"] },
      },
    },
    {
      symbol: "INFY",
      instrument: { name: "Infosys Ltd", symbol: "INFY" },
      signal: {
        signal: "NO_TRADE",
        action: "WAIT",
        marketRegime: "RANGEBOUND",
        freshEntryBlocked: true,
        maturedSignalStatus: "TARGET_2_HIT",
        price: 1850,
      },
    },
  ];

  const aggregated = aggregateMarketData(sampleScanResults);

  assert.equal(aggregated.total, 3);
  assert.equal(aggregated.breadth.bullishPct, 33);
  assert.equal(aggregated.breadth.bearishPct, 33);
  assert.equal(aggregated.breadth.neutralPct, 33);

  assert.equal(aggregated.buyCandidates.length, 1);
  assert.equal(aggregated.buyCandidates[0].symbol, "RELIANCE");
  assert.equal(aggregated.exitCandidates.length, 1);
  assert.equal(aggregated.exitCandidates[0].symbol, "TCS");
  assert.equal(aggregated.overextendedCandidates.length, 1);
  assert.equal(aggregated.overextendedCandidates[0].symbol, "INFY");
});

test("Market Briefing: aggregateMarketData handles empty or errored input safely", () => {
  const aggregated = aggregateMarketData([]);
  assert.equal(aggregated.total, 0);
  assert.equal(aggregated.breadth.bullishPct, 0);
  assert.equal(aggregated.buyCandidates.length, 0);
});

test("Market Briefing: buildMarketBriefingPrompt synthesizes structured instructions", () => {
  const sampleAggregated = {
    total: 10,
    breadth: { bullishPct: 60, bearishPct: 20, neutralPct: 20 },
    regimes: { BULLISH_TREND: 6, RANGEBOUND: 4 },
    buyCandidates: [
      {
        symbol: "TATASTEEL",
        name: "Tata Steel Ltd",
        price: 155.5,
        strength: 82,
        rsi: 61,
        adx: 25,
        volRatio: 1.8,
        risk: { entry: 155.5, stopLoss: 150, target1: 163 },
        evidence: ["Breakout above resistance"],
      },
    ],
    exitCandidates: [],
    overextendedCandidates: [],
  };

  const prompt = buildMarketBriefingPrompt(sampleAggregated, "2026-09-09");

  assert.ok(prompt.includes("Today's Date: 2026-09-09"));
  assert.ok(prompt.includes("Universe Scanned: 10"));
  assert.ok(prompt.includes("60% Bullish, 20% Bearish"));
  assert.ok(prompt.includes("TATASTEEL"));
  assert.ok(prompt.includes("Respond strictly with valid JSON"));
});

test("Market Briefing: formatBriefingMarkdown generates clean markdown report", () => {
  const mockBriefing = {
    marketSentiment: "CAUTIOUS_BULLISH",
    sentimentHeadline: "Selective Momentum Across Large Caps",
    executiveSummary: "Nifty maintaining support above 24,800 with banking leadership.",
    topSwingSetups: [
      {
        symbol: "RELIANCE",
        setupType: "Trend Continuation Breakout",
        entryZone: "₹2950 - ₹2965",
        stopLoss: "₹2890",
        target: "₹3080",
        rationale: "Volume expansion above 20 EMA with bullish RSI.",
      },
    ],
    riskWatchlist: [
      {
        symbol: "TCS",
        warning: "Break below 50 EMA with declining momentum.",
      },
    ],
    tacticalGameplan: [
      "Keep risk per trade bounded to 1% equity.",
      "Trail stop loss aggressively on stocks near historical resistance.",
    ],
  };

  const mockAggregated = {
    total: 15,
    breadth: { bullishPct: 53, bearishPct: 20, neutralPct: 27 },
  };

  const md = formatBriefingMarkdown(mockBriefing, mockAggregated, "2026-09-09");

  assert.ok(md.includes("# 📊 Indian Markets Daily Briefing & Swing Watchlist"));
  assert.ok(md.includes("`CAUTIOUS_BULLISH`"));
  assert.ok(md.includes("Selective Momentum Across Large Caps"));
  assert.ok(md.includes("### RELIANCE — *Trend Continuation Breakout*"));
  assert.ok(md.includes("**Entry Zone:** ₹2950 - ₹2965"));
  assert.ok(md.includes("**TCS:**"));
  assert.ok(md.includes("Trader's Tactical Gameplan"));
});

test("Market Briefing: generateMarketBriefing integrates with mocked Gemini client", async () => {
  const mockGeminiData = {
    marketSentiment: "BULLISH",
    sentimentHeadline: "Broad Market Breakout",
    executiveSummary: "Strong market breadth led by IT and Banking.",
    topSwingSetups: [
      {
        symbol: "TCS",
        setupType: "Pullback",
        entryZone: "₹3900",
        stopLoss: "₹3850",
        target: "₹4020",
        rationale: "Testing major support with volume spike.",
      },
    ],
    riskWatchlist: [],
    tacticalGameplan: ["Ride winners using ATR trailing stop."],
  };

  const mockClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify(mockGeminiData),
      }),
    },
  };

  const mockAnalyzer = async (sym) => ({
    symbol: sym,
    instrument: { name: "Tata Consultancy Services", symbol: "TCS" },
    signal: {
      signal: "BUY",
      action: "BUY",
      marketRegime: "BULLISH_TREND",
      signalStrength: 80,
      price: 3900,
      indicators: { rsi: 60, adx: 25, volumeRatio: 1.2 },
      risk: { entry: 3900, stopLoss: 3850, target1: 4020 },
      evidence: { bullish: ["Test signal"] },
    },
  });

  const result = await generateMarketBriefing({
    symbols: ["TCS"],
    dateStr: "2026-09-09",
    client: mockClient,
    analyzer: mockAnalyzer,
  });

  assert.ok(result.aggregated);
  assert.equal(result.briefing.marketSentiment, "BULLISH");
  assert.ok(result.markdown.includes("Broad Market Breakout"));
});

test("Market Briefing: generateMarketBriefing rejects malformed non-object Gemini payloads", async () => {
  const mockArrayClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify(["not", "an", "object"]),
      }),
    },
  };

  await assert.rejects(
    generateMarketBriefing({
      symbols: ["TCS"],
      client: mockArrayClient,
      analyzer: async (sym) => ({ symbol: sym, signal: { signal: "BUY" } }),
    }),
    /Gemini returned an unexpected briefing payload shape/
  );
});
