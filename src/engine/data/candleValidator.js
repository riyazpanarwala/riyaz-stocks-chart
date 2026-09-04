export function validateCandles(candles, { strictOrder = true } = {}) {
  if (!Array.isArray(candles) || candles.length === 0) throw new Error("Candles must be a non-empty array");
  let previous = -Infinity;
  for (const candle of candles) {
    const time = Date.parse(candle.timestamp);
    if (!Number.isFinite(time)) throw new Error(`Invalid timestamp: ${candle.timestamp}`);
    for (const field of ["open", "high", "low", "close", "volume"]) if (!Number.isFinite(candle[field])) throw new Error(`Invalid ${field} at ${candle.timestamp}`);
    if (candle.volume < 0) throw new Error(`Negative volume at ${candle.timestamp}`);
    if (candle.low > Math.min(candle.open, candle.close) || candle.high < Math.max(candle.open, candle.close) || candle.high < candle.low) throw new Error(`Inconsistent OHLC at ${candle.timestamp}`);
    if (strictOrder && time <= previous) throw new Error(`Candles are not strictly increasing at ${candle.timestamp}`);
    previous = time;
  }
  return true;
}

export function normalizeCandles(candles) {
  const byTimestamp = new Map();
  let duplicatesRemoved = 0;
  for (const candle of candles) {
    const key = new Date(candle.timestamp).toISOString();
    if (byTimestamp.has(key)) duplicatesRemoved++;
    byTimestamp.set(key, { ...candle, timestamp: key });
  }
  const normalized = [...byTimestamp.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  validateCandles(normalized);
  return { candles: normalized, duplicatesRemoved };
}
