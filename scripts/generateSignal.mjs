// scripts/generateSignal.mjs
import fs from "node:fs/promises";
import { generateSignal } from "../src/engine/strategy/signalEngine.js";

const file = process.argv[2];
const positionState = process.argv.includes("--holding") ? "LONG" : "FLAT";

if (!file) {
  console.log("Usage: node scripts/generateSignal.mjs <dataset.json> [--holding]");
  process.exit(1);
}

try {
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  const candles = Array.isArray(parsed) ? parsed : parsed.candles;
  const signal = generateSignal(candles, { positionState });
  console.log(JSON.stringify(signal, null, 2));
} catch (error) {
  console.error(`✖ Generate signal failed: ${error.message}`);
  process.exitCode = 1;
}
