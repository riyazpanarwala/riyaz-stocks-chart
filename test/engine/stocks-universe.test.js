import test from "node:test";
import assert from "node:assert/strict";
import { resolveInstrument } from "../../src/engine/config/quickAnalysis.js";
import { getUniverse, resolveUniverseInstrument } from "../../src/engine/config/stocksUniverse.js";

test("Universe loads NSE and BSE databases from public folder", () => {
  const universe = getUniverse();
  assert.ok(universe.nseCount > 2000, `Expected > 2000 NSE stocks, found ${universe.nseCount}`);
  assert.ok(universe.bseCount > 4000, `Expected > 4000 BSE stocks, found ${universe.bseCount}`);
});

test("Resolves arbitrary NSE stock from CSV (TATAPOWER)", () => {
  const resolved = resolveInstrument("TATAPOWER");
  assert.equal(resolved.symbol, "TATAPOWER");
  assert.equal(resolved.exchange, "NSE");
  assert.equal(resolved.instrumentKey, "NSE_EQ|INE245A01021");
});

test("Resolves ZOMATO alias to ETERNAL", () => {
  const resolved = resolveInstrument("ZOMATO");
  assert.equal(resolved.symbol, "ETERNAL");
  assert.equal(resolved.exchange, "NSE");
  assert.equal(resolved.instrumentKey, "NSE_EQ|INE758T01015");
});

test("Resolves LTIM alias to LTM (LTIMindtree)", () => {
  const resolved = resolveInstrument("LTIM");
  assert.equal(resolved.symbol, "LTM");
  assert.equal(resolved.name, "LTIMindtree Limited");
  assert.equal(resolved.exchange, "NSE");
  assert.equal(resolved.instrumentKey, "NSE_EQ|INE214T01019");
});


test("Resolves arbitrary BSE stock by numeric scrip code (500325 Reliance)", () => {
  const resolved = resolveInstrument("500325");
  assert.equal(resolved.code, "500325");
  assert.equal(resolved.exchange, "BSE");
  assert.match(resolved.instrumentKey, /^BSE_EQ\|INE002A01018/);
});

test("Resolves BSE stock with BSE: prefix", () => {
  const resolved = resolveInstrument("BSE:500002");
  assert.equal(resolved.code, "500002");
  assert.equal(resolved.exchange, "BSE");
  assert.equal(resolved.instrumentKey, "BSE_EQ|INE117A01022");
});

test("Resolves stock by ISIN directly", () => {
  const resolved = resolveInstrument("INE467B01029");
  assert.match(resolved.instrumentKey, /INE467B01029/);
});

test("Preserves raw Upstox instrument key", () => {
  const key = "NSE_EQ|INE467B01029";
  const resolved = resolveInstrument(key);
  assert.equal(resolved.instrumentKey, key);
  assert.equal(resolved.symbol, key);
});

test("Throws descriptive error on invalid symbol", () => {
  assert.throws(
    () => resolveInstrument("NON_EXISTENT_SYMBOL_XYZ_123"),
    /Unknown stock symbol/
  );
});
