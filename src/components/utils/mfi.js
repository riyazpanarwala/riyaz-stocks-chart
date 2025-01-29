const { mfi } = require("technicalindicators");

const mfiCalc = (arr) => {
  let period = 14;
  let input = {
    high: arr.map((v) => v.high),
    low: arr.map((v) => v.low),
    close: arr.map((v) => v.close),
    volume: arr.map((v) => v.volume),
    period: period,
  };

  const mfiData = mfi(input);

  let newArr = [];
  arr.forEach((v, i) => {
    if (i < period + 1) {
      newArr = [...newArr, { ...v, mfi: "" }];
    } else {
      newArr = [...newArr, { ...v, mfi: mfiData[i - period - 1] }];
    }
  });

  return newArr;
};

export default mfiCalc;
