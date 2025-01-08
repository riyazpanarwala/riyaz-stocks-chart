import React from "react";
import { ema, rsi } from "react-financial-charts";
import { calculateAngle } from "./calculateAngle";

const emaPeriod1 = 15;
const emaPeriod2 = 45;

const useData = (initialData, indicatorName) => {
  let ema12, ema26, rsiCalculator, rsiYAccessor;
  let calculatedData = initialData;
  let angles;

  const calculateDMI = (data) => {
    const windowSize = 14; // 14-day window for DMI calculation

    let adx = [];
    let tr = [];
    let plusDM = [];
    let minusDM = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        tr.push(0);
        plusDM.push(0);
        minusDM.push(0);
      } else {
        const highLow = data[i].high - data[i].low;
        const highClose = Math.abs(data[i].high - data[i - 1].close);
        const lowClose = Math.abs(data[i].low - data[i - 1].close);
        tr.push(Math.max(highLow, highClose, lowClose));

        const deltaHigh = data[i].high - data[i - 1].high;
        const deltaLow = data[i - 1].low - data[i].low;
        plusDM.push(deltaHigh > deltaLow && deltaHigh > 0 ? deltaHigh : 0);
        minusDM.push(deltaLow > deltaHigh && deltaLow > 0 ? deltaLow : 0);
      }

      if (i >= windowSize) {
        const sumTR = tr
          .slice(i - windowSize + 1, i + 1)
          .reduce((a, b) => a + b, 0);
        const sumPlusDM = plusDM
          .slice(i - windowSize + 1, i + 1)
          .reduce((a, b) => a + b, 0);
        const sumMinusDM = minusDM
          .slice(i - windowSize + 1, i + 1)
          .reduce((a, b) => a + b, 0);

        const plusDIVal = (sumPlusDM / sumTR) * 100;
        const minusDIVal = (sumMinusDM / sumTR) * 100;

        const dx =
          (Math.abs(plusDIVal - minusDIVal) / (plusDIVal + minusDIVal)) * 100;
        const adxVal =
          adx.length < windowSize
            ? dx
            : (adx[adx.length - 1].value * (windowSize - 1) + dx) / windowSize;
        adx.push({
          date: data[i].date,
          value: adxVal,
        });
        data[i].plusDI = plusDIVal;
        data[i].minusDI = minusDIVal;
        data[i].adx = adxVal;
      } else {
        adx.push({ date: data[i].date, value: 0 });
        data[i].plusDI = 0;
        data[i].minusDI = 0;
        data[i].adx = 0;
      }
    }

    return data;
  };

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
    calculatedData = calculateDMI(initialData);
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
