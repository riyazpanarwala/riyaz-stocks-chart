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
    if (i < period + 1) {
      newArr = [...newArr, { ...v, will: "" }];
    } else {
      newArr = [...newArr, { ...v, will: data[i - period - 1] }];
    }
  });

  return newArr;
};
