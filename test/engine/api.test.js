import test from "node:test";
import assert from "node:assert/strict";
import { getHistoricalCandles, getIntradayCandles } from "../../src/engine/api/upstox.js";

test("Upstox request retries a 429 and preserves the V3 path", async () => {
  let calls = 0, requestedUrl;
  const client = { get: async (url) => {
    calls++; requestedUrl = url;
    if (calls === 1) throw { response: { status: 429, headers: { "retry-after": "0" }, data: { message: "rate limited" } } };
    return { data: { status: "success", data: { candles: [] } } };
  } };
  const response = await getHistoricalCandles({ instrumentKey: "NSE_EQ|TEST", unit: "minutes", interval: 5, fromDate: "2024-01-01", toDate: "2024-01-02", client, maxRetries: 1, baseDelayMs: 0 });
  assert.equal(calls, 2); assert.match(requestedUrl, /NSE_EQ%7CTEST\/minutes\/5\/2024-01-02\/2024-01-01$/); assert.equal(response.status, "success");
});

test("Upstox request does not retry authentication failures", async () => {
  let calls = 0;
  const client = { get: async () => { calls++; throw { response: { status: 401, data: { message: "bad token" } } }; } };
  await assert.rejects(getHistoricalCandles({ instrumentKey: "X", fromDate: "2024-01-01", toDate: "2024-01-02", client, maxRetries: 3 }), /401/);
  assert.equal(calls, 1);
});

test("Upstox intraday request uses the documented V3 one-minute path", async () => {
  let requestedUrl;
  const client = { get: async (url) => { requestedUrl = url; return { data: { status: "success", data: { candles: [] } } }; } };
  await getIntradayCandles({ instrumentKey: "NSE_EQ|TEST", unit: "minutes", interval: 1, client });
  assert.equal(requestedUrl, "/historical-candle/intraday/NSE_EQ%7CTEST/minutes/1");
});
