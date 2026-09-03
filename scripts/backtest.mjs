// scripts/backtest.mjs
import fs from "node:fs/promises";
import { runBacktest } from "../src/engine/backtest/backtestEngine.js";

const file = process.argv[2];
const output = process.argv[3] ?? "data/backtest-result.json";
if (!file) {
  console.error("Usage: node scripts/backtest.mjs <dataset.json> [output.json]");
  process.exit(1);
}

try {
  const parsed = JSON.parse(await fs.readFile(file, "utf8"));
  const candles = Array.isArray(parsed) ? parsed : parsed.candles;
  const result = runBacktest(candles);
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.metrics, null, 2));
  console.log(`\n✔ Saved full backtest to ${output}`);
} catch (error) {
  console.error(`✖ Backtest failed: ${error.message}`);
  process.exitCode = 1;
}
