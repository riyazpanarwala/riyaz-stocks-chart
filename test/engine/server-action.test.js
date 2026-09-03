import test from "node:test";
import assert from "node:assert/strict";
import { getStockSignalAction } from "../../src/app/actions/stockSignal.js";

test("Server Action rejects empty or invalid symbols", async () => {
  const emptyRes = await getStockSignalAction({ symbol: "" });
  assert.equal(emptyRes.success, false);
  assert.match(emptyRes.error, /required/);

  const invalidRes = await getStockSignalAction({ symbol: "INVALID$<SCRIPT>" });
  assert.equal(invalidRes.success, false);
  assert.match(invalidRes.error, /format/);
});

test("Server Action resolves stock, caches response, and returns signal", async () => {
  const res1 = await getStockSignalAction({ symbol: "TCS", exchange: "NSE", holding: false });
  assert.equal(res1.success, true);
  assert.equal(res1.data.instrument.symbol, "TCS");
  assert.ok(res1.data.signal.signal);
  assert.equal(res1.cached, false);

  // Second call must hit the in-memory cache instantly
  const res2 = await getStockSignalAction({ symbol: "TCS", exchange: "NSE", holding: false });
  assert.equal(res2.success, true);
  assert.equal(res2.cached, true);
  assert.equal(res2.data.instrument.symbol, "TCS");
});
