export function atr(candles, period = 14) {
  const trueRanges = Array(candles.length).fill(null);
  const result = Array(candles.length).fill(null);

  if (candles.length <= period) return result;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges[i] = candles[i].high - candles[i].low;
      continue;
    }

    const { high, low } = candles[i];
    const previousClose = candles[i - 1].close;

    trueRanges[i] = Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose)
    );
  }

  let sum = 0;
  for (let i = 1; i <= period; i++) sum += trueRanges[i];

  let previousAtr = sum / period;
  result[period] = previousAtr;

  for (let i = period + 1; i < candles.length; i++) {
    previousAtr =
      (previousAtr * (period - 1) + trueRanges[i]) / period;
    result[i] = previousAtr;
  }

  return result;
}
