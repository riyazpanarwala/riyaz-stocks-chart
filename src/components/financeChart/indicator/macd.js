// Function to calculate the EMA
export const ema = (prices, period) => {
  const k = 2 / (period + 1);
  const emaArray = [prices[0]]; // First EMA value is the first price

  for (let i = 1; i < prices.length; i++) {
    const ema = prices[i] * k + emaArray[i - 1] * (1 - k);
    emaArray.push(ema);
  }

  return emaArray;
};

// Function to calculate the MACD
export const macd = (
  candles,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) => {
  const prices = candles.map((v) => v.close);
  const shortEMA = ema(prices, shortPeriod);
  const longEMA = ema(prices, longPeriod);

  const macdLine = shortEMA.map((shortEma, index) => shortEma - longEMA[index]);
  const signalLine = ema(macdLine.slice(longPeriod - 1), signalPeriod); // Start signal line after enough data points
  const histogram = macdLine
    .slice(longPeriod - 1)
    .map((macd, index) => macd - signalLine[index]);

  return {
    macdLine: macdLine.slice(longPeriod - 1), // Align MACD line with signal line
    signalLine,
    histogram,
  };
};
