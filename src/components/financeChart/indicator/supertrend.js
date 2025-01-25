import { atr } from "./atr";

export const supertrend = (data, period = 10, multiplier = 3) => {
  const atrArr = atr(data, period);
  let arr = [];
  let upperBand = 0;
  let lowerBand = 0;
  let inUptrend = true;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      arr = [...arr, { ...data[i], trend: null }];
    } else {
      const hl2 = (data[i].high + data[i].low) / 2;
      upperBand = hl2 + multiplier * atrArr[i - period];
      lowerBand = hl2 - multiplier * atrArr[i - period];

      if (inUptrend) {
        if (data[i].close < lowerBand) inUptrend = false;
      } else {
        if (data[i].close > upperBand) inUptrend = true;
      }

      if (inUptrend) {
        arr = [...arr, { ...data[i], trend: lowerBand }];
      } else {
        arr = [...arr, { ...data[i], trend: upperBand }];
      }
    }
  }

  return arr;
};
