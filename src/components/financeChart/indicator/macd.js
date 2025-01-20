import { ema } from "./ema";

export function calculateZeroLagEMA(data, period) {
  const ema1 = ema(data, period, true);
  const ema2 = ema(ema1, period, false);
  return ema1.map((value, index) => 2 * value - ema2[index]);
}

export function zeroLagMACD(
  data,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) {
  const shortEMA = calculateZeroLagEMA(data, shortPeriod);
  const longEMA = calculateZeroLagEMA(data, longPeriod);
  const macdLine = shortEMA.map((value, index) => value - longEMA[index]);
  const signalLine = ema(macdLine.slice(longPeriod - 1), signalPeriod, false);
  const histogram = macdLine
    .slice(longPeriod - 1)
    .map((value, index) => value - signalLine[index]);

  return {
    macdLine: macdLine.slice(longPeriod - 1),
    signalLine,
    histogram,
  };
}

// Function to calculate the MACD
export const macd = (
  candles,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) => {
  const shortEMA = ema(candles, shortPeriod, true);
  const longEMA = ema(candles, longPeriod, true);

  const macdLine = shortEMA.map((value, index) => value - longEMA[index]);
  const signalLine = ema(macdLine.slice(longPeriod - 1), signalPeriod, false); // Start signal line after enough data points
  const histogram = macdLine
    .slice(longPeriod - 1)
    .map((value, index) => value - signalLine[index]);

  return {
    macdLine: macdLine.slice(longPeriod - 1), // Align MACD line with signal line
    signalLine,
    histogram,
  };
};
