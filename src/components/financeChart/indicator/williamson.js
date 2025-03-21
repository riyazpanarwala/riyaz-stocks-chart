const williamsr = require("technicalindicators").williamsr;

export const williamson = (arr, period = 14) => {
  let input = {
    high: arr.map((v) => v.high),
    low: arr.map((v) => v.low),
    close: arr.map((v) => v.close),
    volume: arr.map((v) => v.volume),
    period: period,
  };

  const data = williamsr(input);

  let newArr = [];
  arr.forEach((v, i) => {
    if (i < arr.length - data.length) {
      newArr = [...newArr, { ...v, will: "" }];
    } else {
      newArr = [...newArr, { ...v, will: data[i - arr.length + data.length] }];
    }
  });

  return newArr;
};

/**
 *
 * @param {number[]} high
 * @param {number[]} low
 * @param {number[]} close
 * @param {number} period
 * @param {number} [size]
 * @returns
 */
export const willr = (high, low, close, period, size = high.length) => {
  const output = [];

  // if (period < 1) throw new Error("Invalid Options")
  // if (size <= period - 1) throw new Error("Out of range")

  let trail = 0;
  let maxi = -1;
  let mini = -1;
  let max = high[0];
  let min = low[0];
  let bar;

  let j;
  for (let i = period - 1; i < size; ++i, ++trail) {
    // Maintain highest
    bar = high[i];
    if (maxi < trail) {
      maxi = trail;
      max = high[maxi];
      j = trail;

      while (++j <= i) {
        bar = high[j];
        if (bar >= max) {
          max = bar;
          maxi = j;
        }
      }
    } else if (bar >= max) {
      maxi = i;
      max = bar;
    }

    // Maintain lowest
    bar = low[i];
    if (mini < trail) {
      mini = trail;
      min = low[mini];
      j = trail;

      while (++j <= i) {
        bar = low[j];
        if (bar <= min) {
          min = bar;
          mini = j;
        }
      }
    } else if (bar <= min) {
      mini = i;
      min = bar;
    }

    const highlow = max - min;
    const r = highlow == 0.0 ? 0.0 : -100 * ((max - close[i]) / highlow);
    output.push(r);
  }

  return output;
};
