import test from "node:test";
import assert from "node:assert/strict";
import { mergeCorporateActions } from "../../src/components/utils/corporateActions.js";

test("Yahoo dividends and bonus events enrich Upstox candles without changing prices", () => {
  const candles = [{ date: "2024-06-21 00:00:00", open: 300, close: 310, volume: 100 }];
  const events = {
    dividends: [{ date: new Date("2024-06-21T03:45:00Z"), amount: 10 }],
    splits: [{ date: new Date("2024-06-21T03:45:00Z"), numerator: 2, denominator: 1, splitRatio: "2:1" }],
  };
  const result = mergeCorporateActions(candles, events);
  assert.equal(result[0].dividend.amount, 10);
  assert.equal(result[0].split.splitRatio, "2:1");
  assert.equal(result[0].close, 310);
  assert.equal(result[0].volume, 100);
  assert.equal(candles[0].dividend, undefined);
  assert.deepEqual(mergeCorporateActions(result, events), result);
});

test("weekly and monthly candles retain multiple actions including the last bucket", () => {
  for (const interval of ["1wk", "1mo"]) {
    const result = mergeCorporateActions([{ date: "2024-06-17" }], {
      dividends: [
        { date: "2024-06-18", amount: 1 },
        { date: "2024-06-21", amount: 2 },
        { date: "2024-06-01", amount: 3 },
        { date: "2024-08-01", amount: 4 },
      ],
    }, interval);
    assert.deepEqual(result[0].dividends.map((event) => event.amount), [1, 2]);
  }
});

test("missing events leave price candles usable and daily events require a matching date", () => {
  const candles = [{ date: "2024-06-21", close: 310 }];
  assert.deepEqual(mergeCorporateActions(candles, {}), candles);
  assert.deepEqual(mergeCorporateActions(candles, { dividends: [{ date: "2024-06-20", amount: 1 }] }), candles);
});
