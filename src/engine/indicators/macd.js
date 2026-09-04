import { ema } from "./ema.js";

export function macd(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);

  const macdLine = values.map((_, i) => {
    if (fast[i] == null || slow[i] == null) return null;
    return fast[i] - slow[i];
  });

  const validMacd = macdLine.filter((value) => value != null);
  const signalValues = ema(validMacd, signalPeriod);
  const signalLine = Array(values.length).fill(null);

  let signalIndex = 0;
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] != null) {
      signalLine[i] = signalValues[signalIndex++];
    }
  }

  const histogram = values.map((_, i) => {
    if (macdLine[i] == null || signalLine[i] == null) return null;
    return macdLine[i] - signalLine[i];
  });

  return { macdLine, signalLine, histogram };
}
