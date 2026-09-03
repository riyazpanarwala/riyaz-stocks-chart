// scripts/analyze.mjs
import { analyzeStock, formatCompactAnalysis } from "../src/engine/quick/analyzeStock.js";
import { resolveInstrument } from "../src/engine/config/quickAnalysis.js";

const args = process.argv.slice(2);
const symbolArg = args.find((a) => !a.startsWith("-"));
const isHolding = args.includes("--holding");
const isBse = args.includes("--bse");
const timeframeArg = args.find((a) => a.startsWith("--timeframe="))?.split("=")[1];

if (!symbolArg) {
  console.log("Usage: node scripts/analyze.mjs <SYMBOL> [--holding] [--bse] [--timeframe=1d]");
  console.log("Examples:");
  console.log("  node scripts/analyze.mjs TCS");
  console.log("  node scripts/analyze.mjs ZOMATO --holding");
  console.log("  node scripts/analyze.mjs 500325 --bse");
  console.log("  node scripts/analyze.mjs 'NSE_EQ|INE467B01029'");
  process.exit(1);
}

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
