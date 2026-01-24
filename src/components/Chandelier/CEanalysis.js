function calculateATR(candles, period = 22) {
  const atr = [];
  let trSum = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atr.push(null);
      continue;
    }

    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    if (i < period) {
      trSum += tr;
      atr.push(null);
    } else if (i === period) {
      trSum += tr;
      atr.push(trSum / period);
    } else {
      const prevATR = atr[i - 1];
      atr.push((prevATR * (period - 1) + tr) / period);
    }
  }

  return atr;
}

function highest(arr, i, length, key) {
  let max = -Infinity;
  for (let j = i - length + 1; j <= i; j++) {
    if (j >= 0) max = Math.max(max, arr[j][key]);
  }
  return max;
}

function lowest(arr, i, length, key) {
  let min = Infinity;
  for (let j = i - length + 1; j <= i; j++) {
    if (j >= 0) min = Math.min(min, arr[j][key]);
  }
  return min;
}

function calculateChandelierExit(
  candles,
  length = 22,
  mult = 3,
  useClose = true
) {
  const atrRaw = calculateATR(candles, length); // Wilder ATR
  const result = [];

  let longStop = null;
  let shortStop = null;
  let dir = 1; // 1 = long, -1 = short

  for (let i = 0; i < candles.length; i++) {
    const atr = atrRaw[i] != null ? atrRaw[i] * mult : null;

    if (i < length || atr == null) {
      result.push({
        ...candles[i],
        longStop: null,
        shortStop: null,
        dir,
        signal: null,
      });
      continue;
    }

    const srcHigh = useClose ? "close" : "high";
    const srcLow = useClose ? "close" : "low";

    // --- raw stops
    let longStopRaw = highest(candles, i, length, srcHigh) - atr;

    let shortStopRaw = lowest(candles, i, length, srcLow) + atr;

    const prevLongStop = longStop ?? longStopRaw;
    const prevShortStop = shortStop ?? shortStopRaw;

    // --- lock stops (THIS IS CRITICAL)
    longStop =
      candles[i - 1].close > prevLongStop
        ? Math.max(longStopRaw, prevLongStop)
        : longStopRaw;

    shortStop =
      candles[i - 1].close < prevShortStop
        ? Math.min(shortStopRaw, prevShortStop)
        : shortStopRaw;

    const prevDir = dir;

    // --- direction logic (exact)
    if (candles[i].close > prevShortStop) dir = 1;
    else if (candles[i].close < prevLongStop) dir = -1;
    else dir = prevDir;

    let signal = null;
    if (dir === 1 && prevDir === -1) signal = "BUY";
    if (dir === -1 && prevDir === 1) signal = "SELL";

    result.push({
      ...candles[i],
      bull: dir === 1,
      bear: dir === -1,
      longStop: dir === 1 ? longStop : null,
      shortStop: dir === -1 ? shortStop : null,
      dir,
      signal,
    });
  }

  return result;
}

export { calculateChandelierExit };
