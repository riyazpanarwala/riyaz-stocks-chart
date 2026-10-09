import test from "node:test";
import assert from "node:assert/strict";
import { latestPriorSetup, storeNextDaySetup } from "../../src/components/OptionChainNew/utils/nextDaySetups.js";
import { pendingFillReducer, recordPendingFill } from "../../src/components/OptionChainNew/utils/positionTracking.js";
import { buildPositionPlan, completedSignalCandles, revalidateNextDaySetup } from "../../src/components/OptionChainNew/utils/tradeRules.js";

const now = Date.parse("2026-10-09T05:00:00Z"), expiry = "13-Oct-2026";
const setup = date => ({ date, primarySignal: "BUY CE", recommendedOption: { strike: 24500, expiry },
  tradeLevels: { triggerSpot: 24510, invalidationSpot: 24500, targetSpot: 24600 } });

test("Prior setup selection advances when the panel history and IST session change", () => {
  let history = storeNextDaySetup({}, setup("2026-10-07"));
  assert.equal(latestPriorSetup(history, now).date, "2026-10-07");
  history = storeNextDaySetup(history, setup("2026-10-08"));
  assert.equal(latestPriorSetup(history, now).date, "2026-10-08");
  history = storeNextDaySetup(history, setup("2026-10-09"));
  assert.equal(latestPriorSetup(history, now).date, "2026-10-08");
  assert.equal(latestPriorSetup(history, now + 86400000).date, "2026-10-09");
  assert.equal(latestPriorSetup(history, Date.parse("2026-10-09T18:29:59Z")).date, "2026-10-08");
  assert.equal(latestPriorSetup(history, Date.parse("2026-10-09T18:30:00Z")).date, "2026-10-09");
});

test("Invalid, future and expired history entries do not replace an eligible setup", () => {
  const history = { "2026-10-08": setup("2026-10-08"), "2026-10-09": setup("2026-10-09"),
    "2026-10-10": setup("2026-10-10"), "2026-10-07": { date: "2026-10-07" } };
  assert.equal(latestPriorSetup(history, now).date, "2026-10-08");
  assert.equal(latestPriorSetup({ "2026-10-01": setup("2026-10-01") }, now), null);
  assert.equal(latestPriorSetup([], now), null);
  assert.equal(latestPriorSetup(null, now), null);
});

const signal = (side = "CE", strike = 24500) => ({ rawSignal: side === "CE" ? "BUY CALL" : "BUY PUT",
  contract: { side, strike, expiry }, tradePlan: buildPositionPlan({ side, entryPrice: 100, spot: 24520,
    invalidationSpot: side === "CE" ? 24500 : 24540, targetSpot: side === "CE" ? 24600 : 24400 }) });

test("Pending broker fills retain their original contract through NO TRADE and reversed live signals", () => {
  const original = signal();
  let pending = pendingFillReducer(null, { type: "offer", signal: original, expiry, now });
  assert.ok(pending);
  assert.equal(pendingFillReducer(pending, { type: "offer", signal: { rawSignal: "NO TRADE" }, expiry, now }), pending);
  const replacement = signal("PE", 24600);
  pending = pendingFillReducer(pending, { type: "offer", signal: replacement, expiry, now });
  original.contract.strike = 25000;
  original.tradePlan.entrySpot = 25000;
  const recorded = recordPendingFill(pending, { entryPrice: 105, roundTripCost: 1, openedAt: now });
  assert.equal(recorded.strike, 24500);
  assert.equal(recorded.side, "CE");
  assert.equal(recorded.entrySpot, 24520);
  assert.equal(recorded.stopLoss, 95);
  assert.equal(recorded.expiry, expiry);
  assert.equal(recorded.roundTripCost, 1);
  pending = pendingFillReducer(pending, { type: "clear" });
  assert.equal(pending, null);
  assert.equal(pendingFillReducer(pending, { type: "offer", signal: replacement, expiry, now }).contract.side, "PE");
});

test("An unconfirmed or mismatched contract never becomes a pending broker fill", () => {
  assert.equal(pendingFillReducer(null, { type: "offer", signal: { rawSignal: "NO TRADE" }, expiry, now }), null);
  assert.equal(pendingFillReducer(null, { type: "offer", signal: signal(), expiry: "20-Oct-2026", now }), null);
  assert.equal(recordPendingFill(null, { entryPrice: 100, roundTripCost: 0, openedAt: now }), null);
});

test("Trigger-close checks ignore malformed candles and check the same pair as direction confirmation", () => {
  const candle = (minutes, close, open = close - 1) => ({ date: new Date(now - minutes * 60000).toISOString(),
    open, high: close + 1, low: open - 1, close });
  const valid = [candle(15, 24509), candle(10, 24515)];
  const invalid = candle(5, NaN);
  const candles = [...valid, invalid];
  assert.deepEqual(completedSignalCandles(candles, now), valid);
  const rows = [{ strikePrice: 24500, CE: { lastPrice: 120, bidprice: 119.5, askPrice: 120.5,
    openInterest: 100000, totalTradedVolume: 10000, expiryDate: expiry } }];
  const live = { rows, spot: 24520, timestamp: now, candles, now, marketOpen: true, expiry };
  // Direction is up, but the first valid close remains below the trigger.
  assert.equal(revalidateNextDaySetup(setup("2026-10-08"), live).rawSignal, "NO TRADE");
  const confirmed = [candle(15, 24512), candle(10, 24515)];
  assert.equal(revalidateNextDaySetup(setup("2026-10-08"), { ...live, candles: [...confirmed, invalid] }).rawSignal, "BUY CALL");
  assert.equal(completedSignalCandles([candle(25, 24512)], now).length, 0);
});
