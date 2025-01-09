export const detectHammer = (candle, shadowRatio = 2) => {
  const { open, high, low, close } = candle;

  // Calculate the body size and shadows
  const body = Math.abs(close - open);
  const lowerShadow = Math.min(open, close) - low;
  const upperShadow = high - Math.max(open, close);

  // Check Hammer conditions
  if (
    lowerShadow >= body * shadowRatio && // Lower shadow at least 2x the body
    upperShadow <= body * 0.1 && // Upper shadow is small
    body > 0 // Candle has a valid body
  ) {
    return true;
  }

  return false;
};

export const detectPrevDownsideTrend = (
  candles,
  index,
  minDowntrendCandles = 1
) => {
  if (index < minDowntrendCandles) {
    return false;
  }

  // Check for downtrend
  let isDowntrend = true;
  for (let i = index - minDowntrendCandles; i < index; i++) {
    if (candles[i].close >= candles[i].open) {
      isDowntrend = false;
      break;
    }
  }

  return isDowntrend;
};

export const detectNextBullishTrend = (
  candles,
  index,
  minBullishCandles = 1
) => {
  // Check for bullish trend after the hammer
  if (index + minBullishCandles >= candles.length) {
    return "Not enough data to check for a bullish trend";
  }

  let isBullishTrend = true;
  for (let i = index + 1; i <= index + minBullishCandles; i++) {
    if (
      candles[i].close <= candles[i].open ||
      candles[i].close <= candles[i - 1].close
    ) {
      isBullishTrend = false;
      break;
    }
  }

  return isBullishTrend;
};

export const detectHammerWithTrend = (
  candles,
  index,
  shadowRatio = 2,
  minDowntrendCandles = 1,
  minBullishCandles = 1
) => {
  if (!detectPrevDownsideTrend(candles, index, minDowntrendCandles)) {
    return false;
  }

  if (!detectHammer(candles[index], shadowRatio)) {
    return false;
  }

  return detectNextBullishTrend(candles, index, minBullishCandles);
};

export const detectHammerWithAfterBullishTrend = (
  candles,
  index,
  shadowRatio = 2,
  minBullishCandles = 1
) => {
  if (!detectHammer(candles[index], shadowRatio)) {
    return false;
  }

  return detectNextBullishTrend(candles, index, minBullishCandles);
};

export const detectHammerWithPrevDownTrend = (
  candles,
  index,
  shadowRatio = 2,
  minDowntrendCandles = 1
) => {
  if (!detectPrevDownsideTrend(candles, index, minDowntrendCandles)) {
    return false;
  }

  return detectHammer(candles[index], shadowRatio);
};

export const hammer = (
  candles,
  type,
  shadowRatio = 2,
  minDowntrendCandles = 1,
  minBullishCandles = 1
) => {
  let hammerArr = [];
  if (type === 1) {
    candles.forEach((candle, i) => {
      if (
        detectHammerWithTrend(
          candles,
          i,
          shadowRatio,
          minDowntrendCandles,
          minBullishCandles
        )
      ) {
        hammerArr = [...hammerArr, candle];
      }
    });
  } else if (type === 2) {
    candles.forEach((candle, i) => {
      if (
        detectHammerWithPrevDownTrend(
          candles,
          i,
          shadowRatio,
          minDowntrendCandles
        )
      ) {
        hammerArr = [...hammerArr, candle];
      }
    });
  } else if (type === 3) {
    candles.forEach((candle, i) => {
      if (
        detectHammerWithAfterBullishTrend(
          candles,
          i,
          shadowRatio,
          minBullishCandles
        )
      ) {
        hammerArr = [...hammerArr, candle];
      }
    });
  } else {
    candles.forEach((candle, i) => {
      if (detectHammer(candles[i], shadowRatio)) {
        hammerArr = [...hammerArr, candle];
      }
    });
  }
  return hammerArr;
};
