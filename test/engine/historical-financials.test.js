import test from "node:test";
import assert from "node:assert/strict";
import { getFinanceDataAction } from "../../src/app/actions/finance.js";
import { getHistoricalFinancials } from "../../src/services/finance/quoteService.js";

test("Historical Financials: validates symbols and rejects malicious input", async () => {
  const emptyRes = await getFinanceDataAction({
    symbol: "",
    isHistoricalFinancials: true,
  });
  assert.equal(emptyRes.error, "Invalid or missing symbol.");

  const maliciousRes = await getFinanceDataAction({
    symbol: "RELIANCE;DROP TABLE",
    isHistoricalFinancials: true,
  });
  assert.equal(maliciousRes.error, "Invalid or missing symbol.");
});

test("Historical Financials: returns formatted financial series with valid schema", async () => {
  const result = await getHistoricalFinancials("RELIANCE.NS", "quarterly");
  assert.ok(Array.isArray(result));

  if (result.length > 0) {
    const item = result[0];
    assert.ok(typeof item.date === "string");
    assert.ok(typeof item.periodLabel === "string");
    assert.ok(item.periodType === "3M" || item.periodType === "12M");

    // Financial values should be numeric when present
    if (item.revenueCr != null) {
      assert.ok(typeof item.revenueCr === "number");
      assert.ok(item.revenueCr > 0);
    }
    if (item.operatingMarginPct != null) {
      assert.ok(typeof item.operatingMarginPct === "number");
    }
    if (item.netMarginPct != null) {
      assert.ok(typeof item.netMarginPct === "number");
    }
  }
});

test("Historical Financials: caches successive requests", async () => {
  const start1 = Date.now();
  const res1 = await getHistoricalFinancials("TCS.NS", "annual");
  const duration1 = Date.now() - start1;

  const start2 = Date.now();
  const res2 = await getHistoricalFinancials("TCS.NS", "annual");
  const duration2 = Date.now() - start2;

  assert.ok(Array.isArray(res1));
  assert.ok(Array.isArray(res2));
  assert.equal(res1.length, res2.length);
  // Cached hit should be substantially faster
  assert.ok(duration2 <= duration1);
});
