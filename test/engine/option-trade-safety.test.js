import test from "node:test";
import assert from "node:assert/strict";
import { isolateExpiry, isFresh, liquidQuote, confirmedDirection, buildPositionPlan, evaluatePosition, revalidateNextDaySetup } from "../../src/components/OptionChainNew/utils/tradeRules.js";
import { generateSignal } from "../../src/components/OptionChainNew/utils/signalEngine.js";
import { calculateNextDayTradeLevels, selectOptionToBuy, generate315NextDayOptionSignal, calculateWeightedOptionScore, analyzeOILevels } from "../../src/engine/options/nextDayOptionSignalEngine.js";

const now = Date.parse("2026-10-09T05:00:00Z");
const expiry = "13-Oct-2026";
const leg = (price, oi, change) => ({ lastPrice: price, openInterest: oi, change, changeinOpenInterest: 1000,
  totalTradedVolume: 10000, bidprice: price - 0.5, askPrice: price + 0.5, expiryDate: expiry });
function fixture() {
  const rows = [24400, 24500, 24600].map((strikePrice) => ({ strikePrice, CE: leg(120, 50000, 10), PE: leg(80, 100000, -10) }));
  const prevRows = rows.map((r) => ({ ...r, CE: { ...r.CE, lastPrice: 110, openInterest: 60000 }, PE: { ...r.PE, lastPrice: 90, openInterest: 90000 } }));
  const candles = [15, 10].map((m, i) => ({ date: new Date(now - m * 60_000).toISOString(), open: 24510 + i * 3, close: 24512 + i * 3, high: 24518, low: 24505 }));
  return { rows, context: { now, marketOpen: true, timestamp: now, prevTimestamp: now - 30000, prevRows, candles } };
}

test("Expiry isolation keeps CE/PE, PCR inputs and duplicate strikes in one expiry", () => {
  const rows = [{ strikePrice: 24500, CE: leg(100, 10, 0) },
    { strikePrice: 24500, PE: leg(100, 20, 0) },
    { strikePrice: 24500, CE: { ...leg(100, 99999, 0), expiryDate: "20-Oct-2026" }, PE: { ...leg(100, 1, 0), expiryDate: "20-Oct-2026" } }];
  const isolated = isolateExpiry(rows);
  assert.equal(isolated.expiry, expiry);
  assert.equal(isolated.rows.length, 1);
  assert.equal(isolated.rows[0].CE.openInterest, 10);
  assert.equal(isolated.rows[0].PE.openInterest, 20);
  assert.equal(isolateExpiry(rows, "27-Oct-2026").rows.length, 0);
});

test("NSE timestamps use IST; missing, stale and future source times fail freshness", () => {
  assert.equal(isFresh("09-Oct-2026 10:30:00", now), true);
  for (const value of [null, "invalid", now - 120001, now + 60000, "2026-10-09T10:30:00"]) assert.equal(isFresh(value, now), false);
});

test("Missing, crossed, wide and zero-volume quotes cannot be selected", () => {
  assert.equal(liquidQuote({ ...leg(100, 10000, 0), bidprice: undefined, askPrice: undefined, buyPrice1: 99.5, sellPrice1: 100.5 }).valid, true);
  for (const invalid of [{ bidprice: undefined }, { bidprice: 101, askPrice: 100 }, { bidprice: 90, askPrice: 110 }, { totalTradedVolume: 0 }, { openInterest: 0 }, { lastPrice: Infinity }, { openInterest: NaN }]) {
    const option = { ...leg(100, 10000, 0), ...invalid };
    assert.equal(liquidQuote(option).valid, false);
    assert.equal(selectOptionToBuy({ signal: "BUY CE", rows: [{ strikePrice: 24500, CE: option }], atm: 24500, expiry }), null);
  }
});

test("Completed 5-minute candles must be fresh, consecutive and agree with spot", () => {
  const { context } = fixture();
  assert.equal(confirmedDirection({ ...context, spot: 24520 }), 1);
  assert.equal(confirmedDirection({ ...context, spot: 24500 }), 0);
  assert.equal(confirmedDirection({ ...context, candles: context.candles.slice(0, 1), spot: 24520 }), 0);
  assert.equal(confirmedDirection({ ...context, now: now + 3600000, spot: 24520 }), 0);
});

test("Main entry rejects missing confirmation, unchanged snapshots, closed market and zero volume", () => {
  const { rows, context } = fixture();
  assert.equal(generateSignal(rows, 24500, 2, 24520, context).rawSignal, "BUY CALL");
  for (const change of [{ marketOpen: false }, { timestamp: null }, { prevTimestamp: now }, { candles: [] }, { prevRows: rows }, { prevTimestamp: now - 3600000 }]) {
    assert.equal(generateSignal(rows, 24500, 2, 24520, { ...context, ...change }).rawSignal, "NO TRADE");
  }
  const expired = rows.map((r) => ({ ...r, CE: { ...r.CE, expiryDate: "08-Oct-2026" }, PE: { ...r.PE, expiryDate: "08-Oct-2026" } }));
  assert.equal(generateSignal(expired, 24500, 2, 24520, context).rawSignal, "NO TRADE");
  const illiquid = rows.map((r) => ({ ...r, CE: { ...r.CE, totalTradedVolume: 0 }, PE: { ...r.PE, totalTradedVolume: 0 } }));
  assert.equal(generateSignal(illiquid, 24500, 2, 24520, context).rawSignal, "NO TRADE");
});

test("Increasing PE premiums and OI are not labeled put writing", () => {
  const { rows, context } = fixture();
  const rising = rows.map((r) => ({ ...r, PE: { ...r.PE, lastPrice: 100 } }));
  assert.equal(generateSignal(rising, 24500, 2, 24520, context).oiChangeBias, "Mixed activity");
});

test("Actual fills change stops and independently measured risk/reward; costs can invalidate entry", () => {
  const inputs = { side: "CE", entryPrice: 100, spot: 24520, invalidationSpot: 24500, targetSpot: 24600 };
  const first = buildPositionPlan(inputs);
  assert.equal(first.stopLoss, 90);
  assert.equal(first.target1, 140);
  assert.equal(first.riskRewardRatio, 4);
  assert.equal(buildPositionPlan({ ...inputs, entryPrice: 120 }).stopLoss, 110);
  assert.equal(buildPositionPlan({ ...inputs, targetSpot: 24530 }).eligible, false);
  assert.equal(buildPositionPlan({ ...inputs, roundTripCost: 20 }).eligible, false);
  assert.equal(buildPositionPlan({ ...inputs, invalidationSpot: null }), null);
});

test("Recorded positions exit at stop, target, underlying invalidation, reversal and IST cutoff", () => {
  const position = buildPositionPlan({ side: "CE", entryPrice: 100, spot: 24520, invalidationSpot: 24500, targetSpot: 24600 });
  const quote = { bid: 110, spot: 24530, timestamp: now, now, marketOpen: true };
  assert.equal(evaluatePosition(position, quote).action, "HOLD");
  for (const update of [{ bid: 89 }, { bid: 140 }, { spot: 24500 }, { rawSignal: "BUY PUT", confirmed: true }, { now: Date.parse("2026-10-09T09:50:00Z") }]) {
    assert.equal(evaluatePosition(position, { ...quote, ...update }).action, "EXIT");
  }
  assert.equal(evaluatePosition(position, { ...quote, timestamp: null }).action, "CHECK QUOTE");
  assert.equal(evaluatePosition({ ...position, openedAt: now - 86400000 }, quote).action, "EXIT");
  assert.equal(evaluatePosition(null, quote).action, "NO POSITION");
});

test("Next-day targets come from range and barriers rather than a guaranteed risk multiple", () => {
  const inputs = { spot: 24580, high: 24590, low: 24440, signal: "BUY CE", oiLevels: { support1: 24500, resistance1: 24600, resistance2: 24700 }, optionSelected: { ltp: 100, ask: 100.5, isItm: false } };
  const estimate = calculateNextDayTradeLevels(inputs);
  assert.equal(estimate.indicative, true);
  assert.match(estimate.entryZone, /Requote/);
  assert.ok(estimate.riskRewardRatio < 1.5);
  const live = calculateNextDayTradeLevels({ ...inputs, entryPrice: 140, liveSpot: 24620 });
  assert.equal(live.indicative, false);
  assert.equal(live.stopLoss, 80);
  assert.ok(live.riskRewardRatio < estimate.riskRewardRatio);
});

test("Freshness guard blocks next-day signals without a source timestamp", () => {
  const { rows, context } = fixture();
  const result = generate315NextDayOptionSignal({ optionChain: { underlyingValue: 24520, displayData: rows, expiry },
    spotData: { spot: 24520, open: 24400, high: 24520, low: 24380, prevClose: 24380 }, intradayCandles: context.candles,
    requireFreshData: true, now });
  assert.equal(result.primarySignal, "NO TRADE");
});

test("Next-day live entry requires trigger closes, matching expiry and independently valid reward", () => {
  const { rows, context } = fixture();
  const setup = { date: "2026-10-08", primarySignal: "BUY CE", recommendedOption: { strike: 24500, expiry },
    tradeLevels: { triggerSpot: 24510, invalidationSpot: 24500, targetSpot: 24600 } };
  const live = { rows, spot: 24520, timestamp: now, candles: context.candles, now, marketOpen: true, expiry };
  assert.equal(revalidateNextDaySetup(setup, live).rawSignal, "BUY CALL");
  assert.equal(revalidateNextDaySetup(setup, { ...live, expiry: "20-Oct-2026" }).rawSignal, "NO TRADE");
  assert.equal(revalidateNextDaySetup(setup, { ...live, candles: [] }).rawSignal, "NO TRADE");
  assert.equal(revalidateNextDaySetup({ ...setup, date: "2026-10-09" }, live).rawSignal, "NO TRADE");
  assert.equal(revalidateNextDaySetup({ ...setup, date: "2026-10-01" }, live).rawSignal, "NO TRADE");
  assert.equal(revalidateNextDaySetup(setup, { ...live, now: Date.parse("2026-10-09T09:50:00Z") }).rawSignal, "NO TRADE");
});

test("Next-day scoring distinguishes long buildup from writing and short covering", () => {
  const { rows } = fixture();
  const rising = rows.map((r) => ({ ...r, CE: { ...r.CE, changeinOpenInterest: -1000, change: -10 }, PE: { ...r.PE, change: 10 } }));
  const score = calculateWeightedOptionScore({ spot: 24520, open: 24400, high: 24530, low: 24380, prevClose: 24380, vwap: 24500,
    marketStructureInfo: { structure: "BULLISH" }, oiLevels: analyzeOILevels(rising, 24520, 24500), rows: rising, atm: 24500 });
  assert.equal(score.factorBreakdown.writing.bull, 0);
  assert.equal(score.factorBreakdown.unwinding.bull, 0);
});
