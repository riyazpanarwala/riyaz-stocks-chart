export function mapUpstoxCandles(candles = []) {
  if (!Array.isArray(candles)) throw new Error("Upstox candles must be an array");
  return candles.map((candle) => {
    if (!Array.isArray(candle) || candle.length < 6) throw new Error("Malformed Upstox candle row");
    const time = new Date(candle[0]);
    return {
      timestamp: Number.isNaN(time.getTime()) ? String(candle[0]) : time.toISOString(),
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
      openInterest: candle[6] == null ? null : Number(candle[6])
    };
  });
}
