export function detectBreakout(candles, index, lookback = 20) {
  if (index < lookback) return false;

  const current = candles[index];
  let highestHigh = -Infinity;

  for (let i = index - lookback; i < index; i++) {
    highestHigh = Math.max(highestHigh, candles[i].high);
  }

  return current.close > highestHigh;
}

export function detectBreakdown(candles, index, lookback = 20) {
  if (index < lookback) return false;
  const priorLow = Math.min(...candles.slice(index - lookback, index).map((c) => c.low));
  return candles[index].close < priorLow;
}

export function confirmedSwings(candles, index, left = 2, right = 2) {
  const highs = [], lows = [];
  for (let candidate = left; candidate <= index - right; candidate++) {
    const window = candles.slice(candidate - left, candidate + right + 1);
    const high = candles[candidate].high, low = candles[candidate].low;
    if (window.every((c, offset) => offset === left || high > c.high)) highs.push({ index: candidate, price: high, confirmedAt: candidate + right });
    if (window.every((c, offset) => offset === left || low < c.low)) lows.push({ index: candidate, price: low, confirmedAt: candidate + right });
  }
  return { highs, lows };
}

export function marketStructure(candles, index, left = 2, right = 2) {
  const { highs, lows } = confirmedSwings(candles, index, left, right);
  const lastHighs = highs.slice(-2), lastLows = lows.slice(-2);
  const higherHigh = lastHighs.length === 2 && lastHighs[1].price > lastHighs[0].price;
  const lowerHigh = lastHighs.length === 2 && lastHighs[1].price < lastHighs[0].price;
  const higherLow = lastLows.length === 2 && lastLows[1].price > lastLows[0].price;
  const lowerLow = lastLows.length === 2 && lastLows[1].price < lastLows[0].price;
  return { higherHigh, higherLow, lowerHigh, lowerLow, state: higherHigh && higherLow ? "BULLISH" : lowerHigh && lowerLow ? "BEARISH" : "MIXED", latestSwingHigh: highs.at(-1) ?? null, latestSwingLow: lows.at(-1) ?? null };
}
