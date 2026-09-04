import { mfi as mfiCalc } from "technicalindicators";

export const mfi = (arr, period = 14) => {
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

  const data = mfiCalc(input) || [];
  const offset = arr.length - data.length;

  return arr.map((v, i) => {
    if (i < offset) {
      return { ...v, mfi: "" };
    }
    return { ...v, mfi: data[i - offset] };
  });
};
