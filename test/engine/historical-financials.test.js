import test from "node:test";
import assert from "node:assert/strict";
import { getFinanceDataAction } from "../../src/app/actions/finance.js";
import { getHistoricalFinancials } from "../../src/services/finance/quoteService.js";
import { setCachedData } from "../../src/services/finance/CachedFinancialData.js";

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

test("Historical Financials: reuses cached memory reference on successive requests", async () => {
  // Pre-seed a controlled mock result into the cache
  const mockPayload = [
    {
      date: "2025-03-31",
      periodLabel: "Q4 FY25 (Mar '25)",
      periodType: "3M",
      revenueCr: 50000,
      netIncomeCr: 10000,
      operatingMarginPct: 25,
      netMarginPct: 20,
    },
  ];
  setCachedData("MOCK_CACHE_SYM.NS:historical:quarterly", mockPayload);

  // Calling getHistoricalFinancials with this symbol must return the pre-seeded cached entry directly
  const cachedRes = await getHistoricalFinancials("MOCK_CACHE_SYM.NS", "quarterly");
  assert.equal(cachedRes, mockPayload);

  // Real fetch also returns exact same reference on second call from cache
  const res1 = await getHistoricalFinancials("TCS.NS", "annual");
  const res2 = await getHistoricalFinancials("TCS.NS", "annual");
  assert.equal(res1, res2);
});
