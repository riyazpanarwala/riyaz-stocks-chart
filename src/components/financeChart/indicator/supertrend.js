// import { atr } from "./atr";

const calculateRMA = (src, length) => {
  const alpha = 1 / length;
  const result = [];

  for (let i = 0; i < src.length; i++) {
    if (i === 0) {
      result.push(
        src.slice(0, length).reduce((sum, val) => sum + val, 0) / length
      );
    } else {
      result.push(alpha * src[i] + (1 - alpha) * result[i - 1]);
    }
  }

  return result;
};

const calculateATR = (high, low, close, period) => {
  const trueRange = high.map((h, i) => {
    if (i === 0) return h - low[i];
    return Math.max(
      h - low[i],
      Math.abs(h - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
  });

  return calculateRMA(trueRange, period);
};

export const supertrenddirection = (arr) => {
  // Return true for up arrow (bullish), false for down arrow (bearish)
  return arr[arr.length - 1].direction < 0;
};

export const supertrend = (klines, isResultArr, atrPeriod = 10, factor = 3) => {
  const high = klines.map((k) => k.high);
  const low = klines.map((k) => k.low);
  const close = klines.map((k) => k.close);
  const src = high.map((h, i) => (h + low[i]) / 2);
  const atr = calculateATR(high, low, close, atrPeriod);

  const upperBand = src.map((s, i) => s + factor * atr[i]);
  const lowerBand = src.map((s, i) => s - factor * atr[i]);

  const result = [];

  for (let i = 0; i < close.length; i++) {
    const prevLowerBand =
      i > 0 ? result[i - 1]?.supertrend ?? lowerBand[i] : lowerBand[i];
    const prevUpperBand =
      i > 0 ? result[i - 1]?.supertrend ?? upperBand[i] : upperBand[i];

    const newLowerBand =
      lowerBand[i] > prevLowerBand || close[i - 1] < prevLowerBand
        ? lowerBand[i]
        : prevLowerBand;
    const newUpperBand =
      upperBand[i] < prevUpperBand || close[i - 1] > prevUpperBand
        ? upperBand[i]
        : prevUpperBand;

    let direction;
    let supertrend;

    if (i === 0) {
      direction = 1;
      supertrend = newUpperBand;
    } else if (result[i - 1].supertrend === prevUpperBand) {
      direction = close[i] > newUpperBand ? -1 : 1;
      supertrend = direction === -1 ? newLowerBand : newUpperBand;
    } else {
      direction = close[i] < newLowerBand ? 1 : -1;
      supertrend = direction === -1 ? newLowerBand : newUpperBand;
    }

    result.push({ supertrend, direction });
  }

  if (isResultArr) {
    const newData = klines.map((v, i) => {
      return { ...v, trend: result[i].supertrend };
    });
    return newData;
  }
  // Return true for up arrow (bullish), false for down arrow (bearish)
  return supertrenddirection(result);
};
