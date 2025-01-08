import React from "react";
import { ema, rsi } from "react-financial-charts";
import { calculateAngle } from "./calculateAngle";
import calculateDMI from "./calculateDMI";

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
  } else if (indicatorName === "dmi") {
    const { plusDI, minusDI, adx } = calculateDMI(initialData);
    calculatedData = initialData.map((v, i) => {
      if (i === 0) {
        return v;
      }
      return {
        ...v,
        plusDI: plusDI[i - 1],
        minusDI: minusDI[i - 1],
        adx: adx[i - 1],
      };
    });
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
