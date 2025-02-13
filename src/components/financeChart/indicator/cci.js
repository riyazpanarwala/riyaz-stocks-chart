const cciCalc = require("technicalindicators").cci;

export const cci = (arr, period = 20) => {
  let input = {
    high: arr.map((v) => v.high),
    low: arr.map((v) => v.low),
    close: arr.map((v) => v.close),
    volume: arr.map((v) => v.volume),
    period: period,
  };

  const cciData = cciCalc(input);

  let newArr = [];
  arr.forEach((v, i) => {
    if (i < period + 1) {
      newArr = [...newArr, { ...v, cci: "" }];
    } else {
      newArr = [...newArr, { ...v, cci: cciData[i - period - 1] }];
    }
  });

  return newArr;
};
