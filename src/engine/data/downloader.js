import { getHistoricalCandles } from "../api/upstox.js";
import { resolveTimeframe } from "../config/timeframes.js";
import { createDateWindows } from "./dateWindows.js";
import { mapUpstoxCandles } from "./candleMapper.js";
import { normalizeCandles } from "./candleValidator.js";
import { detectGaps } from "./gapDetector.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function downloadHistoricalDataset({ instrumentKey, timeframe = "1d", fromDate, toDate, requestsPerSecond = 10, fetchPage = getHistoricalCandles, ...requestOptions }) {
  const tf = resolveTimeframe(timeframe);
  const windows = createDateWindows(fromDate, toDate, tf.maxWindowDays);
  const rows = [], delay = 1000 / Math.max(1, requestsPerSecond);
  for (let i = 0; i < windows.length; i++) {
    if (i) await sleep(delay);
    const response = await fetchPage({ instrumentKey, unit: tf.unit, interval: tf.interval, ...windows[i], ...requestOptions });
    rows.push(...(response.data?.candles ?? []));
  }
  const { candles, duplicatesRemoved } = normalizeCandles(mapUpstoxCandles(rows));
  const gaps = detectGaps(candles, { expectedMinutes: tf.expectedMinutes, ignoreDateBoundaries: tf.unit === "minutes" || tf.unit === "hours", weekdaysOnly: tf.unit === "days" });
  return { metadata: { instrumentKey, timeframe, fromDate, toDate, downloadedAt: new Date().toISOString(), requestCount: windows.length, candleCount: candles.length, duplicatesRemoved, gapCount: gaps.length }, gaps, candles };
}
