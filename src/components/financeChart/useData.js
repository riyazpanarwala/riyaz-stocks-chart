import React from "react";
import {
  ema,
  rsi,
  macd,
  sma,
  bollingerBand,
  algo,
} from "@riyazpanarwala/indicators";
import {
  dmi,
  obv,
  emaAngle,
  zeroLagMACD,
  supertrend,
  mfi,
  sto,
  cci,
} from "./indicator";

const emaPeriod1 = 50;
const emaPeriod2 = 200;

const useData = (initialData, indicatorName, isIntraday) => {
  let ema12, ema26, rsiCalculator, rsiYAccessor;
  let ema5, ema8, ema13;
  let calculatedData = initialData;
  let angles;
  let macdCalculator;
  let sma20, sma50, sma200;
  let ma1, ma2;
  let bb;

  if (indicatorName === "ema") {
    if (isIntraday) {
      ema5 = ema()
        .id(1)
        .options({ windowSize: 5 })
        .merge((d, c) => {
          d.ema5 = c;
        })
        .accessor((d) => d.ema5);
      /*
      ema8 = ema()
        .id(2)
        .options({ windowSize: 8 })
        .merge((d, c) => {
          d.ema8 = c;
        })
        .accessor((d) => d.ema8);
*/
      ema13 = ema()
        .id(3)
        .options({ windowSize: 13 })
        .merge((d, c) => {
          d.ema13 = c;
        })
        .accessor((d) => d.ema13);
      calculatedData = ema13(ema5(initialData));
      angles = "";
    } else {
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
    }
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
    calculatedData = supertrend(initialData, true);
  } else if (indicatorName === "mfi") {
    calculatedData = mfi(initialData);
  } else if (indicatorName === "sto") {
    calculatedData = sto(initialData);
  } else if (indicatorName === "bolinger") {
    sma20 = sma()
      .options({ windowSize: 20 })
      .merge((d, c) => {
        d.sma20 = c;
      })
      .accessor((d) => d.sma20);

    bb = bollingerBand()
      .merge((d, c) => {
        d.bb = c;
      })
      .accessor((d) => d.bb);

    calculatedData = sma20(bb(initialData));
  } else if (indicatorName === "cci") {
    calculatedData = cci(initialData);
  } else if (
    indicatorName === "5-20-sma" ||
    indicatorName === "20-50-sma" ||
    indicatorName === "50-200-sma"
  ) {
    let period1 = 50;
    let period2 = 200;
    if (indicatorName === "5-20-sma") {
      period1 = 5;
      period2 = 20;
    } else if (indicatorName === "20-50-sma") {
      period1 = 20;
      period2 = 50;
    }
    ma1 = sma()
      .id(0)
      .options({ windowSize: period1 })
      .merge((d, c) => {
        d[`ma${period1}`] = c;
      })
      .accessor((d) => d[`ma${period1}`]);

    ma2 = sma()
      .id(2)
      .options({ windowSize: period2 })
      .merge((d, c) => {
        d[`ma${period2}`] = c;
      })
      .accessor((d) => d[`ma${period2}`]);

    const buySell = algo()
      .windowSize(2)
      .accumulator(([prev, now]) => {
        const {
          [`ma${period1}`]: prevShortTerm,
          [`ma${period2}`]: prevLongTerm,
        } = prev;
        const {
          [`ma${period1}`]: nowShortTerm,
          [`ma${period2}`]: nowLongTerm,
        } = now;
        if (prevShortTerm < prevLongTerm && nowShortTerm > nowLongTerm)
          return `LONG${indicatorName}`;
        if (prevShortTerm > prevLongTerm && nowShortTerm < nowLongTerm)
          return `SHORT${indicatorName}`;
      })
      .merge((d, c) => {
        d.longShort = c;
      });

    calculatedData = buySell(ma2(ma1(initialData)));
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
    bb,
    ema5,
    ema8,
    ema13,
    ma1,
    ma2,
  };
};

export default useData;
