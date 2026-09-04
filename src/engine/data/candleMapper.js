function parseRequiredNumber(val, fieldName) {
  if (val == null || (typeof val === "string" && val.trim() === "")) {
    throw new Error(`Candle field ${fieldName} must not be blank`);
  }
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error(`Candle field ${fieldName} must be a finite number`);
  }
  return num;
}

/**
 * Maps raw Upstox candle array rows to standard candle objects.
 * @param {Array<Array>} [candles=[]] Array of Upstox candle rows [timestamp, open, high, low, close, volume, openInterest]
 * @returns {Array<Object>} Normalized candle objects
 * @throws {Error} When candle rows are malformed or contain blank/non-finite OHLCV values
 */
export function mapUpstoxCandles(candles = []) {
  if (!Array.isArray(candles)) throw new Error("Upstox candles must be an array");
  return candles.map((candle) => {
    if (!Array.isArray(candle) || candle.length < 6) throw new Error("Malformed Upstox candle row");
    const time = new Date(candle[0]);
    return {
      timestamp: Number.isNaN(time.getTime()) ? String(candle[0]) : time.toISOString(),
      open: parseRequiredNumber(candle[1], "open"),
      high: parseRequiredNumber(candle[2], "high"),
      low: parseRequiredNumber(candle[3], "low"),
      close: parseRequiredNumber(candle[4], "close"),
      volume: parseRequiredNumber(candle[5], "volume"),
      openInterest: candle[6] == null || (typeof candle[6] === "string" && candle[6].trim() === "")
        ? null
        : parseRequiredNumber(candle[6], "openInterest")
    };
  });
}
