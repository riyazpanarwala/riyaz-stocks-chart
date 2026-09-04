export function adx(candles, period = 14) {
  const result = Array(candles.length).fill(null);
  const plusDIValues = Array(candles.length).fill(null);
  const minusDIValues = Array(candles.length).fill(null);

  if (candles.length <= period * 2 - 1) return { adx: result, plusDI: plusDIValues, minusDI: minusDIValues };

  const tr = Array(candles.length).fill(0);
  const plusDM = Array(candles.length).fill(0);
  const minusDM = Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    tr[i] = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let trSum = 0;
  let plusSum = 0;
  let minusSum = 0;

  for (let i = 1; i <= period; i++) {
    trSum += tr[i];
    plusSum += plusDM[i];
    minusSum += minusDM[i];
  }

  const dx = Array(candles.length).fill(null);

  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      trSum = trSum - trSum / period + tr[i];
      plusSum = plusSum - plusSum / period + plusDM[i];
      minusSum = minusSum - minusSum / period + minusDM[i];
    }

    const plusDI = trSum === 0 ? 0 : (plusSum / trSum) * 100;
    const minusDI = trSum === 0 ? 0 : (minusSum / trSum) * 100;
    plusDIValues[i] = plusDI;
    minusDIValues[i] = minusDI;
    const denominator = plusDI + minusDI;

    dx[i] =
      denominator === 0
        ? 0
        : (Math.abs(plusDI - minusDI) / denominator) * 100;
  }

  const firstDx = [];
  for (let i = period; i < period * 2; i++) {
    if (dx[i] != null) firstDx.push(dx[i]);
  }

  if (firstDx.length < period) return { adx: result, plusDI: plusDIValues, minusDI: minusDIValues };

  let currentAdx =
    firstDx.reduce((a, b) => a + b, 0) / period;

  result[period * 2 - 1] = currentAdx;

  for (let i = period * 2; i < candles.length; i++) {
    if (dx[i] == null) continue;

    currentAdx =
      (currentAdx * (period - 1) + dx[i]) / period;

    result[i] = currentAdx;
  }

  return { adx: result, plusDI: plusDIValues, minusDI: minusDIValues };
}
