// scripts/fetchData.mjs
import fs from "node:fs/promises";
import { downloadHistoricalDataset } from "../src/engine/data/downloader.js";
import { resolveInstrument } from "../src/engine/config/quickAnalysis.js";

const symbolOrKey = process.argv[2];
const fromDate = process.argv[3];
const toDate = process.argv[4];
const timeframe = process.argv[5] ?? "1d";

if (!symbolOrKey || !fromDate || !toDate) {
  console.log(
    "Usage: node scripts/fetchData.mjs <SYMBOL_OR_KEY> <fromDate> <toDate> [1m|5m|15m|30m|1h|1d|1w|1M]"
  );
  console.log("Example: node scripts/fetchData.mjs TCS 2024-01-01 2026-09-02 1d");
  process.exit(1);
}

try {
  const instrument = resolveInstrument(symbolOrKey);
  console.log(`Resolved ${symbolOrKey} -> ${instrument.instrumentKey} (${instrument.name})`);

  const dataset = await downloadHistoricalDataset({
    instrumentKey: instrument.instrumentKey,
    timeframe,
    fromDate,
    toDate
  });

  await fs.mkdir("data", { recursive: true });
  const fileName = instrument.instrumentKey.replaceAll("|", "_").replaceAll("/", "_");
  const output = `data/${fileName}.json`;

  await fs.writeFile(output, JSON.stringify(dataset, null, 2));

  console.log(`Downloaded ${dataset.candles.length} candles in ${dataset.metadata.requestCount} request(s)`);
  console.log(`Removed ${dataset.metadata.duplicatesRemoved} duplicate(s); detected ${dataset.metadata.gapCount} gap(s)`);
  console.log(`Saved to ${output}`);
} catch (error) {
  console.error(`✖ Fetch failed: ${error.message}`);
  process.exitCode = 1;
}
