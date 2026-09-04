// scripts/scan.mjs
import { analyzeStock } from "../src/engine/quick/analyzeStock.js";

const DEFAULT_WATCHLIST = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "BHARTIARTL",
  "SBIN",
  "ITC",
  "LT",
  "SUNPHARMA",
  "TITAN",
  "BAJFINANCE",
  "MARUTI",
  "BEL",
  "NIFTYBEES",
  "BANKBEES",
];

const customListArg = process.argv.slice(2).find((a) => !a.startsWith("-"));
const symbolsToScan = customListArg
  ? customListArg.split(",").map((s) => s.trim().toUpperCase())
  : DEFAULT_WATCHLIST;

console.log("\n=========================================================================");
console.log(`  🔍 MARKET WATCHLIST SCANNER (${symbolsToScan.length} STOCKS)`);
console.log("  Scanning for confirmed BUY / EXIT setups across liquid leaders...");
console.log("=========================================================================\n");

const results = [];
const buyAlerts = [];
const exitAlerts = [];

for (const symbol of symbolsToScan) {
  process.stdout.write(`Scanning ${symbol.padEnd(12)}... `);
  try {
    const res = await analyzeStock(symbol, { lookbackCalendarDays: 365, timeframe: "1d" });
    const sig = res.signal;
    const isBuy = sig?.signal === "BUY";
    const isExit = sig?.signal === "EXIT";

    const price = res.signal?.price != null ? `₹${res.signal.price.toFixed(2)}` : "N/A";
    const adxStr = sig?.indicators?.adx != null ? Number(sig.indicators.adx).toFixed(1) : "N/A";
    const rsiStr = sig?.indicators?.rsi != null ? Number(sig.indicators.rsi).toFixed(1) : "N/A";
    const bullScore = sig?.bullishScore != null ? sig.bullishScore : "-";
    const bearScore = sig?.bearishScore != null ? sig.bearishScore : "-";

    const item = {
      Symbol: symbol,
      Price: price,
      Regime: sig?.marketRegime ?? "UNKNOWN",
      Signal: sig?.signal ?? "NO_TRADE",
      Action: sig?.action ?? "WAIT",
      "Bull/Bear": `${bullScore}/${bearScore}`,
      ADX: adxStr,
      RSI: rsiStr,
      Reason: isBuy
        ? "✅ HIGH CONFLUENCE BUY SETUP"
        : isExit
          ? "🛑 EXIT / TAKE PROFIT / CUT LOSS"
          : sig?.action === "AVOID"
            ? "Avoid (Bearish/Downtrend)"
            : sig?.status === "INSUFFICIENT_DATA"
              ? "Insufficient Data"
              : "Wait (Choppy / Low momentum)",
    };

    results.push(item);
    if (isBuy) buyAlerts.push(symbol);
    if (isExit) exitAlerts.push(symbol);

    console.log(`[${sig.signal}] -> ${sig.action}`);
  } catch (err) {
    console.log(`✖ Failed: ${err.message}`);
  }
}

console.log("\n--- COMPLETE SCANNER RESULTS ---");
console.table(results);

console.log("\n--- SUMMARY ALERTS ---");
if (buyAlerts.length > 0) {
  console.log(`🟢 CONFIRMED BUY SETUPS (${buyAlerts.length}): ${buyAlerts.join(", ")}`);
} else {
  console.log("⚪ No confirmed BUY setups right now (Market in consolidation / wait phase).");
}

if (exitAlerts.length > 0) {
  console.log(`🔴 EXIT SIGNALS (${exitAlerts.length}): ${exitAlerts.join(", ")}`);
} else {
  console.log("⚪ No active EXIT triggers on watchlist.");
}
console.log("=========================================================================\n");
