import { cci as cciCalc } from "technicalindicators";

export const cci = (arr, period = 20) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return [];
  }

  const input = {
    high: arr.map((v) => v.high),
    low: arr.map((v) => v.low),
    close: arr.map((v) => v.close),
    volume: arr.map((v) => v.volume),
    period: period,
  };

  const data = cciCalc(input) || [];
  const offset = arr.length - data.length;

  return arr.map((v, i) => {
    if (i < offset) {
      return { ...v, cci: "" };
    }
    return { ...v, cci: data[i - offset] };
  });
};
