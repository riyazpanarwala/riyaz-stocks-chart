// test/engine/sector-breadth.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTOR_DEFINITIONS,
  getSectorBreadthData,
} from "../../src/services/market/sectorBreadthService.js";

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

test("Sector Breadth Service: returns structured payload and valid breadth statistics", async () => {
  const result = await getSectorBreadthData({ forceRefresh: false });

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

  // Check sector structure
  const firstSector = result.sectors[0];
  assert.ok(firstSector.name, "Sector must have name");
  assert.equal(typeof firstSector.changePercent, "number");
  assert.ok(Array.isArray(firstSector.constituents), "Sector constituents must be an array");

  // Check caching
  const cachedResult = await getSectorBreadthData({ forceRefresh: false });
  assert.equal(cachedResult.isCached, true, "Second call within TTL should return cached data");
});
