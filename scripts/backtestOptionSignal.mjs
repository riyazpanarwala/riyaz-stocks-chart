// scripts/backtestOptionSignal.mjs
// ═══════════════════════════════════════════════════════════════════════════
// CLI RUNNER: 3:15 PM NEXT-DAY OPTION SIGNAL HISTORICAL BACKTEST
// ═══════════════════════════════════════════════════════════════════════════
// Usage:
//   node scripts/backtestOptionSignal.mjs
//   node scripts/backtestOptionSignal.mjs <dataset.json>
//   node scripts/backtestOptionSignal.mjs --days 120
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs/promises";
import YahooFinance from "yahoo-finance2";
import { runNextDayOptionBacktest } from "../src/engine/backtest/nextDayOptionBacktest.js";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const args = process.argv.slice(2);
const daysIdx = args.indexOf("--days");
const daysToFetch = daysIdx !== -1 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : 180;
const fileArg = args.find((a, i) => !a.startsWith("-") && !(daysIdx !== -1 && i === daysIdx + 1));
const allowSynthetic = args.includes("--synthetic");

console.log("\n=========================================================================");
console.log("  📊 HISTORICAL BACKTEST: NIFTY 3:15 PM NEXT-DAY OPTION SIGNAL");
console.log(`  Evaluating historical performance across trading sessions...`);
console.log("=========================================================================\n");

let candles = [];

if (fileArg) {
  try {
    const raw = await fs.readFile(fileArg, "utf8");
    const parsed = JSON.parse(raw);
    const loaded = Array.isArray(parsed) ? parsed : parsed?.candles;
    candles = Array.isArray(loaded) ? loaded : [];
    console.log(`✔ Loaded ${candles.length} candles from local file: ${fileArg}`);
  } catch (err) {
    console.warn(`Could not read local file ${fileArg}: ${err.message}`);
  }
}

if (!candles.length) {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Math.round(daysToFetch * 1.5));

    const result = await yahooFinance.chart("^NSEI", {
      interval: "1d",
      period1: fromDate.toISOString(),
    });

    const quotes = (result?.quotes ?? []).filter((q) => q.close !== null && q.open !== null);

    if (quotes.length >= 10) {
      candles = quotes.map((q) => ({
        date: q.date,
        open: Number(q.open),
        high: Number(q.high),
        low: Number(q.low),
        close: Number(q.close),
        volume: Number(q.volume || 100_000),
      }));
      console.log(`✔ Retrieved ${candles.length} trading days from market feeds.`);
    }
  } catch (err) {
    console.log(`ℹ Remote chart feed unavailable (${err.message}).`);
  }
}

// Fallback: standard realistic NIFTY benchmark walk only if --synthetic is explicitly passed
if (!candles.length) {
  if (!allowSynthetic) {
    console.error("✖ No candle data available. Please provide a historical JSON file (e.g. node scripts/backtestOptionSignal.mjs data.json), ensure internet connectivity for Yahoo Finance, or pass --synthetic to run on synthetic test data.");
    process.exit(1);
  }

  console.warn("⚠️  WARNING: Running backtest on SYNTHETIC mathematical mock data (--synthetic flag passed). This is not real market data!\n");
  let base = 24200;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 180);

  for (let i = 0; i < 120; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    // Realistic NIFTY daily swing
    const noise = Math.sin(i / 3) * 60 + Math.cos(i / 5) * 40;
    const trend = (i % 8 === 0 ? -120 : (i % 5 === 0 ? 90 : 20));
    base = Math.max(22000, Math.round(base + trend + noise));

    const open = Math.round(base - 30 + Math.sin(i) * 20);
    const high = Math.round(Math.max(open, base) + 40 + Math.abs(Math.sin(i * 2)) * 30);
    const low = Math.round(Math.min(open, base) - 40 - Math.abs(Math.cos(i * 2)) * 30);

    candles.push({
      date: d.toISOString().slice(0, 10),
      open,
      high,
      low,
      close: base,
      volume: 180_000,
    });
  }
}

const metrics = runNextDayOptionBacktest(candles);

console.log("-------------------------------------------------------------------------");
console.log("🎯 STRATEGY BACKTEST PERFORMANCE METRICS");
console.log("-------------------------------------------------------------------------");
console.log(`Total Trading Sessions:     ${metrics.totalSessions}`);
console.log(`Total Signals Generated:    ${metrics.totalSignals}`);
console.log(`  • CE Signals:             ${metrics.ceSignals}`);
console.log(`  • PE Signals:             ${metrics.peSignals}`);
console.log(`  • NO TRADE Signals:       ${metrics.noTradeSignals}`);
console.log("");
console.log(`Executed Trades:            ${metrics.executedTrades}`);
console.log(`  • Not Triggered (Pass):   ${metrics.notTriggeredTrades}`);
console.log(`  • Gap Exceeded (No Chase):${metrics.doNotChaseTrades}`);
console.log(`Winning Trades:             ${metrics.winningTrades}`);
console.log(`Losing Trades:              ${metrics.losingTrades}`);
console.log(`Win Rate:                   ${metrics.winRate}%`);
console.log("");
console.log(`Average Profit / Win:       ₹${metrics.avgProfit.toLocaleString("en-IN")}`);
console.log(`Average Loss / Loss:        ₹${metrics.avgLoss.toLocaleString("en-IN")}`);
console.log(`Profit Factor:              ${metrics.profitFactor}`);
console.log(`Average Risk / Reward:      1 : ${metrics.averageRiskReward}`);
console.log(`Maximum Drawdown:           ${metrics.maxDrawdown}%`);
console.log(`Max Consecutive Losses:     ${metrics.consecutiveLosses}`);
console.log("-------------------------------------------------------------------------\n");

if (metrics.monthlyPerformance?.length) {
  console.log("📅 MONTHLY PERFORMANCE BREAKDOWN:");
  console.log("Month      Trades   Win Rate   P&L (₹)");
  console.log("---------  -------  ---------  ----------");
  for (const m of metrics.monthlyPerformance) {
    console.log(`${m.month.padEnd(11)}${String(m.trades).padEnd(9)}${m.winRate.padEnd(11)}${m.pnl}`);
  }
  console.log("-------------------------------------------------------------------------\n");
}

if (metrics.tradeLogs?.length) {
  console.log("📝 RECENT EXECUTED TRADES SAMPLE:");
  for (const t of metrics.tradeLogs.slice(-5)) {
    const badge = t.result === "WIN" ? "🟢 WIN " : t.result === "LOSS" ? "🔴 LOSS" : "⚪ SKIP";
    console.log(`  ${badge} [${t.date} -> ${t.nextDate}] ${t.signal} (${t.strike}): PnL: ${t.pointsPnL} pts (${t.result})`);
  }
  console.log("");
}
