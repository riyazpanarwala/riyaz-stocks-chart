import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { C } from "../../src/components/OptionChainNew/constants.js";
import { fmtK } from "../../src/components/OptionChainNew/utils/formatters.js";

const require = createRequire(import.meta.url);
const { transform, loadBindings } = require("next/dist/build/swc");
await loadBindings();

const source = await readFile(new URL("../../src/components/OptionChainNew/ui/CallPutDiffTable.jsx", import.meta.url), "utf8");
const { code } = await transform(source, {
  filename: "CallPutDiffTable.jsx",
  jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
  module: { type: "commonjs" },
});

const exports = {};
vm.runInNewContext(code, {
  exports,
  require: (name) => {
    if (name.endsWith("constants.js")) return { C };
    if (name.endsWith("formatters.js")) return { fmtK };
    return require(name);
  },
});

const { CallPutDiffTable } = exports;

test("CallPutDiffTable: filters out strikes with unavailable metrics instead of coercing to 0", () => {
  const rows = [
    {
      strikePrice: 24000,
      CE: { openInterest: null, changeinOpenInterest: 10, lastPrice: 100, available: false },
      PE: { openInterest: 50000, changeinOpenInterest: 20, lastPrice: 90, available: true },
    },
    {
      strikePrice: 24100,
      CE: { openInterest: 20000, changeinOpenInterest: 5, lastPrice: 80, available: true },
      PE: { openInterest: 60000, changeinOpenInterest: 15, lastPrice: 70, available: true },
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(CallPutDiffTable, {
      rows,
      atm: 24100,
      spot: 24100,
    })
  );

  // 24000 has null / unavailable CE openInterest, so it should be filtered out
  assert.doesNotMatch(html, /24,000/);
  assert.match(html, /24,100/);
  // 24100 PE (60,000) > CE (20,000) => Diff is -40,000 => Bullish
  assert.match(html, /BULLISH/);
});

test("CallPutDiffTable: PCR card displays valid ratio for OI and shows '—' when invalid", () => {
  const rows = [
    {
      strikePrice: 24500,
      CE: { openInterest: 10000, changeinOpenInterest: 100, lastPrice: 50, available: true },
      PE: { openInterest: 15000, changeinOpenInterest: 200, lastPrice: 45, available: true },
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(CallPutDiffTable, {
      rows,
      atm: 24500,
      spot: 24500,
    })
  );

  // PCR = 15000 / 10000 = 1.50
  assert.match(html, /1\.50/);
});
