// test/engine/macro-sentiment.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyVixRegime,
  classifyInstitutionalStance,
  formatFiiDiiData,
  formatIndexBreadth,
  getMacroSentimentData,
  resetSentimentCache,
} from "../../src/services/market/macroSentimentService.js";

test("VIX Regime: accurately classifies volatility zones and returns advice", () => {
  const unknown = classifyVixRegime(0);
  assert.equal(unknown.zone, "Unknown");
  assert.equal(unknown.badgeColor, "neutral");

  const low = classifyVixRegime(11.2);
  assert.equal(low.zone, "Low");
  assert.equal(low.badgeColor, "success");
  assert.match(low.label, /Low Volatility/i);
  assert.ok(low.optionBuyers.length > 0);

  const normal = classifyVixRegime(14.5);
  assert.equal(normal.zone, "Normal");
  assert.equal(normal.badgeColor, "info");
  assert.match(normal.label, /Healthy/i);

  const elevated = classifyVixRegime(18.7);
  assert.equal(elevated.zone, "Elevated");
  assert.equal(elevated.badgeColor, "warning");
  assert.match(elevated.label, /Caution/i);

  const panic = classifyVixRegime(26.3);
  assert.equal(panic.zone, "High");
  assert.equal(panic.badgeColor, "danger");
  assert.match(panic.label, /Panic/i);
});

test("Institutional Stance: accurately determines institutional market bias", () => {
  // Coordinated buying
  const coordinated = classifyInstitutionalStance(1200, 800);
  assert.equal(coordinated.stance, "Coordinated Strong Accumulation");
  assert.equal(coordinated.badgeColor, "success");
  assert.equal(coordinated.bias, "Strongly Bullish");

  // Moderate inflow
  const moderate = classifyInstitutionalStance(200, 300);
  assert.equal(moderate.stance, "Moderate Institutional Inflow");
  assert.equal(moderate.badgeColor, "success");

  // DII absorbing FII selling
  const absorption = classifyInstitutionalStance(-1000, 1500);
  assert.equal(absorption.stance, "DII Absorption of FII Outflows");
  assert.equal(absorption.badgeColor, "info");

  // Heavy FII distribution
  const heavyFiiSell = classifyInstitutionalStance(-2200, 400);
  assert.equal(heavyFiiSell.stance, "Heavy FII Distribution");
  assert.equal(heavyFiiSell.badgeColor, "danger");

  // Twin liquidation
  const twinSell = classifyInstitutionalStance(-500, -300);
  assert.equal(twinSell.stance, "Twin Institutional Liquidation");
  assert.equal(twinSell.badgeColor, "danger");

  // Mixed / Balanced
  const balanced = classifyInstitutionalStance(100, -50);
  assert.equal(balanced.stance, "Mixed / Balanced Institutional Flows");
  assert.equal(balanced.badgeColor, "neutral");
});

test("formatFiiDiiData: normalizes raw records safely", () => {
  const empty = formatFiiDiiData([]);
  assert.equal(empty.fii.net, 0);
  assert.equal(empty.dii.net, 0);
  assert.equal(empty.stance.bias, "Neutral");

  const mockRecords = [
    {
      category: "DII",
      date: "23-Sep-2026",
      buyValue: "12500.50",
      sellValue: "8500.25",
      netValue: "4000.25",
    },
    {
      category: "FII/FPI",
      date: "23-Sep-2026",
      buyValue: "9000.00",
      sellValue: "11500.00",
      netValue: "-2500.00",
    },
  ];

  const result = formatFiiDiiData(mockRecords);
  assert.equal(result.date, "23-Sep-2026");
  assert.equal(result.dii.buy, 12500.5);
  assert.equal(result.dii.sell, 8500.25);
  assert.equal(result.dii.net, 4000.25);
  assert.equal(result.fii.buy, 9000);
  assert.equal(result.fii.sell, 11500);
  assert.equal(result.fii.net, -2500);
  assert.equal(result.stance.stance, "DII Absorption of FII Outflows");
});

test("formatIndexBreadth: formats benchmark advances, declines, and valuation", () => {
  const empty = formatIndexBreadth(null);
  assert.deepEqual(empty.benchmarks, []);
  assert.equal(empty.valuation.pe, 0);

  const mockIndices = [
    {
      index: "NIFTY 50",
      last: 24500,
      variation: 120,
      percentChange: 0.49,
      advances: "35",
      declines: "15",
      unchanged: "0",
      pe: "21.5",
      pb: "3.2",
      dy: "1.15",
    },
    {
      index: "NIFTY 500",
      last: 23000,
      variation: 150,
      percentChange: 0.65,
      advances: "320",
      declines: "180",
      unchanged: "0",
    },
  ];

  const result = formatIndexBreadth(mockIndices);
  assert.equal(result.benchmarks.length, 2);

  const n50 = result.benchmarks.find((b) => b.label === "NIFTY 50");
  assert.ok(n50);
  assert.equal(n50.advances, 35);
  assert.equal(n50.declines, 15);
  assert.equal(n50.adRatio, 2.33);
  assert.equal(n50.advancesPct, 70);

  assert.equal(result.valuation.pe, 21.5);
  assert.equal(result.valuation.pb, 3.2);
  assert.equal(result.valuation.dy, 1.15);
  assert.equal(result.valuation.status, "Fair / Historical Median");
});

test("Macro Sentiment Service: integrates mock clients, calculates sentiment, and leverages cache", async () => {
  resetSentimentCache();

  const mockNseClient = {
    getDataByEndpoint: async () => [
      {
        category: "DII",
        date: "23-Sep-2026",
        buyValue: "10000",
        sellValue: "8000",
        netValue: "2000",
      },
      {
        category: "FII/FPI",
        date: "23-Sep-2026",
        buyValue: "12000",
        sellValue: "11000",
        netValue: "1000",
      },
    ],
    getAllIndices: async () => ({
      data: [
        {
          index: "NIFTY 50",
          last: 24500,
          variation: 100,
          percentChange: 0.41,
          advances: "30",
          declines: "20",
          unchanged: "0",
          pe: "20.1",
          pb: "3.0",
          dy: "1.2",
        },
      ],
    }),
  };

  const mockYfClient = {
    quote: async (symbol) => {
      if (symbol === "^INDIAVIX") {
        return {
          symbol: "^INDIAVIX",
          regularMarketPrice: 13.5,
          regularMarketChange: -0.4,
          regularMarketChangePercent: -2.87,
          fiftyTwoWeekHigh: 24.5,
          fiftyTwoWeekLow: 9.8,
          regularMarketDayHigh: 14.1,
          regularMarketDayLow: 13.2,
        };
      }
      return null;
    },
  };

  const mockBreadthFn = async () => ({
    breadth: {
      above50Pct: 65.5,
      above200Pct: 72.0,
      above50Count: 65,
      above200Count: 72,
      totalStocks: 100,
      breadthRegime: "Bullish",
      regimeColor: "bullish",
    },
  });

  // 1. Initial fetch
  const data1 = await getMacroSentimentData({
    forceRefresh: false,
    nseClient: mockNseClient,
    yfClient: mockYfClient,
    breadthFn: mockBreadthFn,
  });

  assert.equal(data1.isCached, false);
  assert.equal(data1.vix.value, 13.5);
  assert.equal(data1.vix.regime.zone, "Normal");
  assert.equal(data1.fiiDii.fii.net, 1000);
  assert.equal(data1.fiiDii.dii.net, 2000);
  assert.equal(data1.fiiDii.stance.stance, "Coordinated Strong Accumulation");
  assert.equal(data1.dmaBreadth.above50Pct, 65.5);
  assert.ok(data1.benchmarks.length > 0);

  // 2. Immediate second fetch should be cached
  const data2 = await getMacroSentimentData({
    forceRefresh: false,
    nseClient: mockNseClient,
    yfClient: mockYfClient,
    breadthFn: mockBreadthFn,
  });

  assert.equal(data2.isCached, true);
  assert.equal(data2.vix.value, 13.5);
});
