import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { C } from "../../src/components/OptionChainNew/constants.js";
import { fmtK } from "../../src/components/OptionChainNew/utils/formatters.js";
import { analyzePcrTrend, getPcrSentiment } from "../../src/components/OptionChainNew/utils/maxPainPcrEngine.js";

// Exercise the actual JSX component boundary, where the missing freshness
// props disabled recording despite correct calculations in the hook.
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require("next/dist/build/swc");
await loadBindings();
const source = await readFile(new URL("../../src/components/OptionChainNew/ui/MaxPainPcrTracker.jsx", import.meta.url), "utf8");
const { code } = await transform(source, {
  filename: "MaxPainPcrTracker.jsx",
  jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
  module: { type: "commonjs" },
});
let captured;
const exports = {};
vm.runInNewContext(code, {
  exports,
  require: name => {
    if (name.endsWith("useMaxPainPcrTrend.js")) return { useMaxPainPcrTrend: params => {
      captured = params;
      return { snapshots: [], rawSnapshotsCount: 0, trendMetrics: analyzePcrTrend([]),
        pcrSentiment: getPcrSentiment(params.pcr), volPcr: null, maxPainCurve: [], maxPainCalculated: 0, clearHistory: () => {} };
    } };
    if (name.endsWith("constants.js")) return { C };
    if (name.endsWith("formatters.js")) return { fmtK };
    if (name === "recharts") return new Proxy({}, { get: () => () => null });
    if (name === "framer-motion") return { motion: { div: ({ children, style }) => React.createElement("div", { style }, children) } };
    return require(name);
  },
});

test("PCR tracker forwards source timestamp, clock and open state to the recording hook", () => {
  const now = Date.parse("2026-10-09T05:00:00Z");
  const props = { instrument: { symbol: "NIFTY" }, activeExpiry: "13-Oct-2026", rows: [], fullOI: [], isIndex: true,
    underlyingValue: 24500, atm: 24500, pcr: 1.42, maxPain: 24500, timestamp: now - 30000, now, marketOpen: true };
  const markup = renderToStaticMarkup(React.createElement(exports.MaxPainPcrTracker, props));
  assert.equal(captured.timestamp, props.timestamp);
  assert.equal(captured.now, now);
  assert.equal(captured.marketOpen, true);
  assert.equal(captured.rows, props.rows);
  assert.match(markup, /High Put OI/);

  renderToStaticMarkup(React.createElement(exports.MaxPainPcrTracker, { ...props, timestamp: null, marketOpen: false }));
  assert.equal(captured.timestamp, null);
  assert.equal(captured.marketOpen, false);
});
