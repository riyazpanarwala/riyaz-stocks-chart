const mfiCalc = require("technicalindicators").mfi;

export const mfi = (arr, period = 14) => {
  let input = {
    high: arr.map((v) => v.high),
    low: arr.map((v) => v.low),
    close: arr.map((v) => v.close),
    volume: arr.map((v) => v.volume),
    period: period,
  };

  const data = mfiCalc(input);

  let newArr = [];
  arr.forEach((v, i) => {
    if (i < arr.length - data.length) {
      newArr = [...newArr, { ...v, mfi: "" }];
    } else {
      newArr = [...newArr, { ...v, mfi: data[i - arr.length + data.length] }];
    }
  });

  return newArr;
};
