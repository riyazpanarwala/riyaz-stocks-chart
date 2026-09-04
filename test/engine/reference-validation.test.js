import test from "node:test";
import assert from "node:assert/strict";
import { EMA, RSI, MACD, ATR, ADX } from "technicalindicators";
import { ema } from "../../src/engine/indicators/ema.js";
import { rsi } from "../../src/engine/indicators/rsi.js";
import { macd } from "../../src/engine/indicators/macd.js";
import { atr } from "../../src/engine/indicators/atr.js";
import { adx } from "../../src/engine/indicators/adx.js";
import { candles } from "./helpers.js";

const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("indicator tails match technicalindicators reference", () => {
  const input = candles(300, 1), close = input.map((c) => c.close);
  near(ema(close, 20).at(-1), EMA.calculate({ values: close, period: 20 }).at(-1));
  near(rsi(close, 14).at(-1), RSI.calculate({ values: close, period: 14 }).at(-1), 0.01);
  const oursMacd = macd(close).macdLine.at(-1);
  const referenceMacd = MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }).at(-1).MACD;
  near(oursMacd, referenceMacd);
  const high = input.map((c) => c.high), low = input.map((c) => c.low);
  near(atr(input, 14).at(-1), ATR.calculate({ high, low, close, period: 14 }).at(-1), 1e-6);
  const oursAdx = adx(input, 14);
  const referenceAdx = ADX.calculate({ high, low, close, period: 14 }).at(-1);
  near(oursAdx.adx.at(-1), referenceAdx.adx, 1e-6);
  near(oursAdx.plusDI.at(-1), referenceAdx.pdi, 1e-6);
  near(oursAdx.minusDI.at(-1), referenceAdx.mdi, 1e-6);
});
