import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { corporateActionDate } from "../../src/components/utils/corporateActionDate.js";

const require = createRequire(import.meta.url);
const { transform, loadBindings } = require("next/dist/build/swc");
await loadBindings();
const source = await readFile(new URL("../../src/components/financeChart/CorporateEventsChart.js", import.meta.url), "utf8");
const { code } = await transform(source, {
  filename: "CorporateEventsChart.js",
  jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
  module: { type: "commonjs" },
});
const exports = {};
vm.runInNewContext(code, {
  exports,
  require: (name) => name === "@riyazpanarwala/core" ? { GenericChartComponent: () => null }
    : name.endsWith("corporateActionDate.js") ? { corporateActionDate } : require(name),
});
const CorporateEventsChart = exports.default;
const dividend = { amount: 10, date: new Date("2024-06-21T03:45:00Z") };
const split = { splitRatio: "2:1", date: new Date("2024-06-21T03:45:00Z") };

for (const [name, events, hasDividend, hasSplit] of [
  ["dividend only", { dividends: [dividend], splits: [] }, true, false],
  ["split only", { splits: [split], dividends: [] }, false, true],
  ["both events", { dividends: [dividend], splits: [split] }, true, true],
  ["legacy dividend", { dividend }, true, false],
  ["legacy split", { split }, false, true],
  ["no events", {}, false, false],
]) {
  test(`corporate badges render safely with ${name}`, () => {
    const chart = new CorporateEventsChart({ enabled: true });
    const markup = renderToStaticMarkup(chart.renderSVG({
      xAccessor: () => 1,
      xScale: () => 100,
      chartConfig: { height: 200, yScale: () => 50 },
      plotData: [{ date: "2024-06-21", low: 300, close: 310, ...events }],
    }));
    assert.equal(markup.includes("dividend-badge"), hasDividend);
    assert.equal(markup.includes("split-badge"), hasSplit);
    if (hasDividend) assert.match(markup, /10\.00/);
    if (hasSplit) assert.match(markup, /2:1/);
    if (hasDividend || hasSplit) assert.match(markup, /Ex-Date: 2024-06-21/);
  });
}

test("corporate action dates handle Date objects, ISO strings and missing dates", () => {
  assert.equal(corporateActionDate(new Date("2024-06-21T03:45:00Z")), "2024-06-21");
  assert.equal(corporateActionDate(new Date("2024-06-25T03:45:00Z")), "2024-06-25");
  assert.equal(corporateActionDate("2024-06-21T09:15:00+05:30"), "2024-06-21");
  assert.equal(corporateActionDate("2024-06-21 00:00:00"), "2024-06-21");
  assert.equal(corporateActionDate(new Date("invalid"), "—"), "—");
  assert.equal(corporateActionDate(null, "2024-06-21"), "2024-06-21");
});

test("popup renders complete ex-dates newest first, including selected event dates", async () => {
  const source = await readFile(new URL("../../src/components/CorporateEventsModal.jsx", import.meta.url), "utf8");
  const { code } = await transform(source, {
    filename: "CorporateEventsModal.jsx",
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
    module: { type: "commonjs" },
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => name.endsWith(".scss") ? {} : name.endsWith("corporateActionDate.js") ? { corporateActionDate } : require(name),
  });
  const markup = renderToStaticMarkup(React.createElement(exports.default, {
    companyObj: { symbol: "BPCL" },
    candleData: [
      { date: "2024-06-21", close: 310, splits: [split] },
      { date: "2024-06-25", close: 320, dividends: [{ amount: 10, date: new Date("2024-06-25T03:45:00Z") }] },
    ],
    selectedEvent: { type: "split", ratio: "2:1", date: split.date },
    onClose: () => {},
  }));
  const body = markup.slice(markup.indexOf("<tbody"));
  assert.ok(body.indexOf("2024-06-25") < body.indexOf("2024-06-21"));
  assert.match(markup, /2024-06-21/);
  assert.doesNotMatch(markup, />Fri<|>Tue<|Invalid Date/);
});
