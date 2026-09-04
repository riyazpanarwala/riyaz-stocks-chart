import test from "node:test";
import assert from "node:assert/strict";
import { getStockSignalAction } from "../../src/app/actions/stockSignal.js";
import { getFinanceDataAction } from "../../src/app/actions/finance.js";
import { getNseEquityAction } from "../../src/app/actions/nseEquity.js";

import { candles } from "./helpers.js";

test("Server Action rejects empty or invalid symbols", async () => {
  const emptyRes = await getStockSignalAction({ symbol: "" });
  assert.equal(emptyRes.success, false);
  assert.match(emptyRes.error, /required/);

  const invalidRes = await getStockSignalAction({ symbol: "INVALID$<SCRIPT>" });
  assert.equal(invalidRes.success, false);
  assert.match(invalidRes.error, /format/);
});

test("Server Action resolves stock, caches response, and returns signal", async () => {
  const history = candles(250, 1);
  const mockDownloader = async () => ({
    metadata: { candleCount: history.length },
    gaps: [],
    candles: history,
  });
  const mockIntradayFetcher = async () => ({ data: { candles: [] } });

  const res1 = await getStockSignalAction({
    symbol: "TCS",
    exchange: "NSE",
    holding: false,
    downloader: mockDownloader,
    intradayFetcher: mockIntradayFetcher,
  });
  assert.equal(res1.success, true);
  assert.equal(res1.data.instrument.symbol, "TCS");
  assert.ok(res1.data.signal.signal);
  assert.equal(res1.cached, false);

  // Second call must hit the in-memory cache instantly
  const res2 = await getStockSignalAction({
    symbol: "TCS",
    exchange: "NSE",
    holding: false,
    downloader: mockDownloader,
    intradayFetcher: mockIntradayFetcher,
  });
  assert.equal(res2.success, true);
  assert.equal(res2.cached, true);
  assert.equal(res2.data.instrument.symbol, "TCS");
});

test("Finance Server Action validates symbols", async () => {
  const emptyRes = await getFinanceDataAction({ symbol: "" });
  assert.equal(emptyRes.error, "Invalid or missing symbol.");

  const invalidRes = await getFinanceDataAction({ symbol: "DROP TABLE;--" });
  assert.equal(invalidRes.error, "Invalid or missing symbol.");
});

test("NSE Equity Server Action validates symbol and apiName", async () => {
  const emptyRes = await getNseEquityAction({ symbol: "" });
  assert.equal(emptyRes.error, "Invalid or missing symbol parameter.");

  const invalidApiRes = await getNseEquityAction({ symbol: "TCS", apiName: "unsupportedApi" });
  assert.match(invalidApiRes.error, /Invalid apiName parameter/);
});
