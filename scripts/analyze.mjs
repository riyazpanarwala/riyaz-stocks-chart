// scripts/analyze.mjs
import { analyzeStock, formatCompactAnalysis } from "../src/engine/quick/analyzeStock.js";
import { DEFAULT_INSTRUMENTS } from "../src/engine/config/quickAnalysis.js";
import fs from "node:fs/promises";

const args = process.argv.slice(2);
const symbolArg = args.find((a) => !a.startsWith("-"));
const isHolding = args.includes("--holding");
const isBse = args.includes("--bse");
const isHelp = args.includes("--help") || args.includes("-h");
const timeframeArg = args.find((a) => a.startsWith("--timeframe="))?.split("=")[1];

if (isHelp) {
  console.log("Usage: node scripts/analyze.mjs [SYMBOL] [--holding] [--bse] [--timeframe=1d]");
  console.log("If SYMBOL is omitted, batch analyzes default watchlist equities and exports a JSON summary.");
  console.log("\nExamples:");
  console.log("  node scripts/analyze.mjs");
  console.log("  node scripts/analyze.mjs TCS");
  console.log("  node scripts/analyze.mjs ZOMATO --holding");
  console.log("  node scripts/analyze.mjs 500325 --bse");
  process.exit(0);
}

if (!symbolArg) {
  const symbols = Object.keys(DEFAULT_INSTRUMENTS);
  console.log(`Analyzing watchlist (${symbols.length} instruments)...`);
  const results = [];

  for (const sym of symbols) {
    try {
      const res = await analyzeStock(sym, {
        positionState: isHolding ? "LONG" : "FLAT",
        exchange: isBse ? "BSE" : undefined,
        timeframe: timeframeArg ?? "1d"
      });
      results.push({
        symbol: sym,
        name: res.instrument.name,
        exchange: res.instrument.exchange || "NSE",
        signal: res.signal.signal,
        action: res.signal.action,
        bullishScore: res.signal.bullishScore,
        bearishScore: res.signal.bearishScore,
        price: res.signal.price,
        regime: res.signal.marketRegime,
        indicators: res.signal.indicators
      });
      const signalStr = (res.signal.signal || "N/A").padEnd(10);
      const actionStr = (res.signal.action || "N/A").padEnd(6);
      console.log(`✔ ${sym.padEnd(12)}: ${signalStr} Action: ${actionStr} Price: ₹${res.signal.price}`);
    } catch (error) {
      console.error(`✖ ${sym.padEnd(12)}: ${error.message}`);
    }
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "_");
  const fileName = `stockAnalysis-${dateStr}-${timeStr}.json`;
  await fs.writeFile(fileName, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nExported ${results.length} results to ${fileName}`);
} else {
  const positionState = isHolding ? "LONG" : "FLAT";
  const exchange = isBse ? "BSE" : undefined;

  try {
    const result = await analyzeStock(symbolArg, {
      positionState,
      exchange,
      timeframe: timeframeArg ?? "1d"
    });
    console.log("\n" + formatCompactAnalysis(result));
    if (result.instrument.name && result.instrument.name !== result.instrument.symbol) {
      console.log(`Company: ${result.instrument.name} (${result.instrument.exchange || "NSE"})`);
      console.log(`Key: ${result.instrument.instrumentKey}`);
    }
  } catch (error) {
    console.error(`\n✖ Analysis failed: ${error.message}`);
    process.exitCode = 1;
  }
}
