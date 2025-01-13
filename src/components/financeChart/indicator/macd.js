import { ema } from "./ema";

// Function to calculate the MACD
export const macd = (
  candles,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) => {
  const shortEMA = ema(candles, shortPeriod, true);
  const longEMA = ema(candles, longPeriod, true);

  const macdLine = shortEMA.map((shortEma, index) => shortEma - longEMA[index]);
  const signalLine = ema(macdLine.slice(longPeriod - 1), signalPeriod, false); // Start signal line after enough data points
  const histogram = macdLine
    .slice(longPeriod - 1)
    .map((macd, index) => macd - signalLine[index]);

  return {
    macdLine: macdLine.slice(longPeriod - 1), // Align MACD line with signal line
    signalLine,
    histogram,
  };
};
