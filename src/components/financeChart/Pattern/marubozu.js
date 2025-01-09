export const marubozu = (candles, tolerance = 0.02) => {
  const marubozuCandles = {
    bullish: [],
    bearish: [],
  };

  candles.forEach((candle) => {
    const { open, high, low, close } = candle;

    // Candle range
    const range = high - low;

    // Tolerances
    const lowerTolerance = range * tolerance; // Allowed shadow/wick size
    const upperTolerance = range * tolerance;

    // Bullish Marubozu
    if (
      Math.abs(open - low) <= lowerTolerance && // Open near low
      Math.abs(close - high) <= upperTolerance && // Close near high
      close > open // Bullish body
    ) {
      marubozuCandles.bullish.push({ ...candle, bull: true });
    }

    // Bearish Marubozu
    if (
      Math.abs(open - high) <= upperTolerance && // Open near high
      Math.abs(close - low) <= lowerTolerance && // Close near low
      open > close // Bearish body
    ) {
      marubozuCandles.bearish.push({ ...candle, bear: true });
    }
  });

  return marubozuCandles;
};
