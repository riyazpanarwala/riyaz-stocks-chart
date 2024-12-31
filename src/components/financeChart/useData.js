import React from "react";
import { ema, rsi } from "react-financial-charts";

const useData = (initialData, indicatorName) => {
  let ema12, ema26, rsiCalculator, rsiYAccessor;
  let calculatedData = initialData;
  if (indicatorName === 1) {
    ema12 = ema()
      .id(1)
      .options({ windowSize: 12 })
      .merge((d, c) => {
        d.ema12 = c;
      })
      .accessor((d) => d.ema12);

    ema26 = ema()
      .id(2)
      .options({ windowSize: 26 })
      .merge((d, c) => {
        d.ema26 = c;
      })
      .accessor((d) => d.ema26);
    calculatedData = ema26(ema12(initialData));
  } else if (indicatorName === 2) {
    rsiCalculator = rsi()
      .options({ windowSize: 14 })
      .merge((d, c) => {
        d.rsi = c;
      })
      .accessor((d) => d.rsi);

    calculatedData = rsiCalculator(initialData);
    rsiYAccessor = rsiCalculator.accessor();
  }

  return {
    calculatedData,
    ema12,
    ema26,
    rsiCalculator,
    rsiYAccessor,
  };
};

export default useData;
