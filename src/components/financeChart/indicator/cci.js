const cciCalc = require("technicalindicators").cci;

export const cci = (arr, period = 20) => {
  let input = {
    high: arr.map((v) => v.high),
    low: arr.map((v) => v.low),
    close: arr.map((v) => v.close),
    volume: arr.map((v) => v.volume),
    period: period,
  };

  const data = cciCalc(input);

  let newArr = [];
  arr.forEach((v, i) => {
    if (i < arr.length - data.length) {
      newArr = [...newArr, { ...v, cci: "" }];
    } else {
      newArr = [...newArr, { ...v, cci: data[i - arr.length + data.length] }];
    }
  });

  return newArr;
};
