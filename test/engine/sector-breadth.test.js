// test/engine/sector-breadth.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTOR_DEFINITIONS,
  getSectorBreadthData,
  resetSectorBreadthCache,
  cleanSymbol,
  formatQuote,
} from "../../src/services/market/sectorBreadthService.js";

/**
 * Creates a deterministic mock YahooFinance client returning fixture data.
 */
function createMockYahooClient() {
  let callCount = 0;
  return {
    get callCount() {
      return callCount;
    },
    quote: async (symbols) => {
      callCount++;
      return symbols.map((sym, idx) => {
        const isUp = idx % 2 === 0;
        return {
          symbol: sym,
          shortName: sym.replace(/\.NS$/, "").replace(/^\^/, ""),
          regularMarketPrice: 1000 + idx * 10,
          regularMarketChange: isUp ? 15.5 : -12.3,
          regularMarketChangePercent: isUp ? 1.55 : -1.23,
          regularMarketDayHigh: 1020 + idx * 10,
          regularMarketDayLow: 990 + idx * 10,
          regularMarketVolume: 500000 + idx * 1000,
          fiftyDayAverage: 980 + idx * 10,
          twoHundredDayAverage: 950 + idx * 10,
          fiftyTwoWeekHigh: 1100 + idx * 10,
          fiftyTwoWeekLow: 800 + idx * 10,
        };
      });
    },
  };
}

test("Sector Definitions: contains verified NSE sectors with non-empty constituents", () => {
  assert.ok(SECTOR_DEFINITIONS.length >= 10, "Should define at least 10 major NSE sectors");

  for (const sector of SECTOR_DEFINITIONS) {
    assert.ok(sector.id, "Sector must have an id");
    assert.ok(sector.name, "Sector must have a name");
    assert.ok(sector.symbol, "Sector must have a symbol");
    assert.ok(sector.category, "Sector must have a category");
    assert.ok(sector.weight > 0, "Sector must have positive weight");
    assert.ok(Array.isArray(sector.constituents), "Sector constituents must be an array");
    assert.ok(sector.constituents.length >= 3, `Sector ${sector.name} must have at least 3 constituents`);
  }
});

test("cleanSymbol and formatQuote: correctly normalizes symbols and handles null averages", () => {
  assert.equal(cleanSymbol("RELIANCE.NS"), "RELIANCE");
  assert.equal(cleanSymbol("^NSEBANK"), "^NSEBANK");
  assert.equal(cleanSymbol(""), "");

  const formattedWithNulls = formatQuote({
    symbol: "TEST.NS",
    regularMarketPrice: 100,
    regularMarketChange: 2,
    regularMarketChangePercent: 2.04,
    fiftyDayAverage: 0, // Should produce null above50
    twoHundredDayAverage: null, // Should produce null above200
  });

  assert.equal(formattedWithNulls.symbol, "TEST");
  assert.equal(formattedWithNulls.above50, null);
  assert.equal(formattedWithNulls.above200, null);
});

test("Sector Breadth Service: uses mock client, calculates breadth, and leverages cache", async () => {
  resetSectorBreadthCache();
  const mockClient = createMockYahooClient();

  const result = await getSectorBreadthData({
    forceRefresh: true,
    quoteClient: mockClient,
  });

  assert.equal(mockClient.callCount, 1, "Mock quote client should be invoked on initial fetch");
  assert.ok(result, "Result must not be null");
  assert.ok(result.timestamp, "Must include timestamp");
  assert.ok(result.breadth, "Must include breadth object");
  assert.ok(Array.isArray(result.sectors), "Must include sectors array");
  assert.ok(result.sectors.length >= 10, "Must return at least 10 sectors");

  const b = result.breadth;
  assert.equal(typeof b.totalStocks, "number");
  assert.ok(b.totalStocks > 0, "Total stocks analyzed must be > 0");
  assert.equal(typeof b.advances, "number");
  assert.equal(typeof b.declines, "number");
  assert.equal(typeof b.adRatio, "number");
  assert.equal(typeof b.above50Pct, "number");
  assert.equal(typeof b.above200Pct, "number");
  assert.ok(b.above50Pct >= 0 && b.above50Pct <= 100, "above50Pct must be between 0 and 100");
  assert.ok(b.above200Pct >= 0 && b.above200Pct <= 100, "above200Pct must be between 0 and 100");
  assert.ok(["bullish", "mild-bullish", "neutral", "mild-bearish", "bearish"].includes(b.regimeColor));

  // Second call within TTL should return cached response without calling mockClient again
  const cachedResult = await getSectorBreadthData({
    forceRefresh: false,
    quoteClient: mockClient,
  });

  assert.equal(cachedResult.isCached, true, "Second call within TTL must return cached data");
  assert.equal(mockClient.callCount, 1, "Mock client should not be called again when cache is valid");

  // Clean up
  resetSectorBreadthCache();
});
