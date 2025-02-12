// Function to detect volume breakout
export const volumeBreakout = (data, period = 14, multiplier = 1.5) => {
  let breakoutsArr = [];
  // Assuming a simple breakout detection based on volume being 1.5 times the average of the past 10 days
  data.forEach((d, i) => {
    if (i < period) return d;
    const past10DaysVol =
      data.slice(i - period, i).reduce((acc, curr) => acc + curr.volume, 0) /
      period;

    if (d.volume > multiplier * past10DaysVol) {
      if (d.close > d.open) {
        if (breakoutsArr[breakoutsArr.length - 1]?.bull !== true) {
          breakoutsArr = [...breakoutsArr, { ...d, bull: true }];
        }
      } else {
        if (breakoutsArr[breakoutsArr.length - 1]?.bear !== true) {
          breakoutsArr = [...breakoutsArr, { ...d, bear: true }];
        }
      }
    }
  });
  return breakoutsArr;
};

export const supportResistanceBreakout = (stockData, windowSize = 14) => {
  const resistance = [];
  const support = [];
  const breakoutsArr = [];

  for (let i = 0; i < stockData.length; i++) {
    if (i >= windowSize) {
      const windowData = stockData.slice(i - windowSize, i);
      const highs = windowData.map((d) => d.high);
      const lows = windowData.map((d) => d.low);
      const avgVolume =
        windowData.reduce((sum, d) => sum + d.volume, 0) / windowSize;

      resistance[i] = Math.max(...highs);
      support[i] = Math.min(...lows);

      const price = stockData[i].close;
      const volume = stockData[i].volume;

      if (price > resistance[i] && volume > avgVolume) {
        if (breakoutsArr[breakoutsArr.length - 1]?.bull !== true) {
          breakoutsArr.push({ ...stockData[i], bull: true });
        }
      } else if (price < support[i] && volume > avgVolume) {
        if (breakoutsArr[breakoutsArr.length - 1]?.bear !== true) {
          breakoutsArr.push({ ...stockData[i], bear: true });
        }
      }
    } else {
      resistance[i] = null;
      support[i] = null;
    }
  }

  return breakoutsArr;
};

export const calculateBuySellBreakouts = (data, period = 20) => {
  let breakoutsArr = [];

  for (let i = period; i < data.length; i++) {
    const high = Math.max(...data.slice(i - period, i).map((d) => d.high));
    const low = Math.min(...data.slice(i - period, i).map((d) => d.low));

    if (data[i].close > high) {
      if (breakoutsArr[breakoutsArr.length - 1]?.bull !== true) {
        breakoutsArr.push({
          ...data[i],
          bull: true,
        });
      }
    } else if (data[i].close < low) {
      if (breakoutsArr[breakoutsArr.length - 1]?.bear !== true) {
        breakoutsArr.push({
          ...data[i],
          bear: true,
        });
      }
    }
  }

  return { breakoutsArr };
};

// Function to calculate the moving average
const calculateMovingAverage = (data, period) => {
  return data.map((_, idx, arr) => {
    if (idx < period - 1) return null;
    const slice = arr.slice(idx - period + 1, idx + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    return sum / period;
  });
};

// Function to calculate the upper and lower channels
const calculateChannels = (data, period, multiplier) => {
  const movingAverage = calculateMovingAverage(data, period);
  const channels = data.map((d, idx) => {
    if (idx < period - 1) return { upper: null, lower: null };
    const slice = data.slice(idx - period + 1, idx + 1);
    const mean = movingAverage[idx];
    const deviation =
      slice.reduce((acc, val) => acc + Math.abs(val.close - mean), 0) / period;
    return {
      upper: mean + multiplier * deviation,
      lower: mean - multiplier * deviation,
    };
  });
  return channels;
};

// Function to identify breakouts
export const calculateAdaptiveBuySellBreakouts = (
  data,
  period = 20,
  multiplier = 2
) => {
  const channels = calculateChannels(data, period, multiplier);
  const breakoutsArr = [];

  data.forEach((d, idx) => {
    if (idx < period - 1) return;
    const { upper, lower } = channels[idx];
    if (d.close > upper) {
      if (breakoutsArr[breakoutsArr.length - 1]?.bull !== true) {
        breakoutsArr.push({
          ...d,
          bull: true,
        });
      }
    } else if (d.close < lower) {
      if (breakoutsArr[breakoutsArr.length - 1]?.bear !== true) {
        breakoutsArr.push({
          ...d,
          bear: true,
        });
      }
    }
  });

  return { channels, breakoutsArr };
};
