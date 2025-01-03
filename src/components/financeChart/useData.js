import React from "react";
import { ema, rsi } from "react-financial-charts";
import { calculateAngle } from "./calculateAngle";

const emaPeriod1 = 15;
const emaPeriod2 = 45;

const useData = (initialData, indicatorName) => {
  let ema12, ema26, rsiCalculator, rsiYAccessor;
  let calculatedData = initialData;
  let angles;

  if (indicatorName === "ema") {
    ema12 = ema()
      .id(1)
      .options({ windowSize: emaPeriod1 })
      .merge((d, c) => {
        d.ema12 = c;
      })
      .accessor((d) => d.ema12);

    ema26 = ema()
      .id(2)
      .options({ windowSize: emaPeriod2 })
      .merge((d, c) => {
        d.ema26 = c;
      })
      .accessor((d) => d.ema26);
    calculatedData = ema26(ema12(initialData));

    angles = calculateAngle(
      initialData,
      "ema12",
      "ema26",
      emaPeriod1,
      emaPeriod2
    );
  } else if (indicatorName === "rsi") {
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
    angles,
  };
};

export default useData;
