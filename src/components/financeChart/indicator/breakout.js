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
        breakoutsArr = [...breakoutsArr, { ...d, bull: true }];
      } else {
        breakoutsArr = [...breakoutsArr, { ...d, bear: true }];
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
        breakoutsArr.push({ ...stockData[i], bull: true });
      } else if (price < support[i] && volume > avgVolume) {
        breakoutsArr.push({ ...stockData[i], bear: true });
      }
    } else {
      resistance[i] = null;
      support[i] = null;
    }
  }

  return breakoutsArr;
};
