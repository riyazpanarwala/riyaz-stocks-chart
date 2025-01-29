import React from "react";
import { ema, rsi, macd, sma } from "@riyazpanarwala/indicators";
import { dmi, obv, emaAngle, zeroLagMACD, supertrend } from "./indicator";
import mfi from "../utils/mfi";

const emaPeriod1 = 50;
const emaPeriod2 = 200;

const useData = (initialData, indicatorName) => {
  let ema12, ema26, rsiCalculator, rsiYAccessor;
  let calculatedData = initialData;
  let angles;
  let macdCalculator;
  let sma20, sma50, sma200;

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

    angles = emaAngle(initialData, "ema12", "ema26", emaPeriod1, emaPeriod2);
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
    const { plusDI, minusDI, adx } = dmi(initialData);
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
  } else if (indicatorName === "obv") {
    calculatedData = obv(initialData);
  } else if (indicatorName === "macd") {
    const shortPeriod = 12;
    const longPeriod = 26;
    const signalPeriod = 9;
    ema12 = ema()
      .id(1)
      .options({ windowSize: shortPeriod })
      .merge((d, c) => {
        d.ema12 = c;
      })
      .accessor((d) => d.ema12);

    ema26 = ema()
      .id(0)
      .options({ windowSize: longPeriod })
      .merge((d, c) => {
        d.ema26 = c;
      })
      .accessor((d) => d.ema26);

    macdCalculator = macd()
      .options({
        fast: shortPeriod,
        slow: longPeriod,
        signal: signalPeriod,
      })
      .merge((d, c) => {
        d.macd = c;
      })
      .accessor((d) => d.macd);

    calculatedData = macdCalculator(ema12(ema26(initialData)));
  } else if (indicatorName === "zerolagmacd") {
    const shortPeriod = 12;
    const longPeriod = 26;
    const signalPeriod = 9;
    ema12 = ema()
      .id(1)
      .options({ windowSize: shortPeriod })
      .merge((d, c) => {
        d.ema12 = c;
      })
      .accessor((d) => d.ema12);

    ema26 = ema()
      .id(0)
      .options({ windowSize: longPeriod })
      .merge((d, c) => {
        d.ema26 = c;
      })
      .accessor((d) => d.ema26);

    const { macdLine, signalLine, histogram } = zeroLagMACD(
      initialData,
      shortPeriod,
      longPeriod,
      signalPeriod
    );

    const macdCalc = (data) => {
      let startIdx = longPeriod - 1;
      for (let i = startIdx; i < data.length; i++) {
        data[i].macd = {
          macd: macdLine[i - startIdx],
          signal: signalLine[i - startIdx],
          divergence: histogram[i - startIdx],
        };
      }
      return data;
    };

    macdCalculator = {
      options: () => {
        return {
          fast: shortPeriod,
          slow: longPeriod,
          signal: signalPeriod,
        };
      },
      accessor: (d) => d.macd,
    };

    calculatedData = macdCalc(ema12(ema26(initialData)));
  } else if (indicatorName === "sma") {
    sma20 = sma()
      .id(1)
      .options({ windowSize: 20 })
      .merge((d, c) => {
        d.sma20 = c;
      })
      .accessor((d) => d.sma20);

    sma50 = sma()
      .id(2)
      .options({ windowSize: 50 })
      .merge((d, c) => {
        d.sma50 = c;
      })
      .accessor((d) => d.sma50);

    sma200 = sma()
      .id(3)
      .options({ windowSize: 200 })
      .merge((d, c) => {
        d.sma200 = c;
      })
      .accessor((d) => d.sma200);

    calculatedData = sma200(sma50(sma20(initialData)));
  } else if (indicatorName === "supertrend") {
    calculatedData = supertrend(initialData);
  } else if (indicatorName === "mfi") {
    calculatedData = mfi(initialData);
  }

  return {
    calculatedData,
    ema12,
    ema26,
    rsiCalculator,
    rsiYAccessor,
    angles,
    macdCalculator,
    sma20,
    sma50,
    sma200,
  };
};

export default useData;
