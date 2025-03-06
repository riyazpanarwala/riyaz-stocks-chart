import { hasOpened } from "./utils/indianstockmarket";
import { getIntradayData, getHistoricDataNSE } from "./getIntervalData";

export const getDataFromIntraday = (intradayData) => {
  const total = intradayData.reduce((sum, candle) => sum + candle[5], 0);

  const maxValue = Math.max.apply(
    Math,
    intradayData.map((d) => d[2])
  );
  const minValue = Math.min.apply(
    Math,
    intradayData.map((d) => d[3])
  );

  return {
    date: intradayData[0][0],
    open: intradayData[0][1],
    close: intradayData[intradayData.length - 1][4],
    high: maxValue,
    low: minValue,
    volume: total,
  };
};

export const getCandleArr = (arr, isEchart) => {
  let timeArr = [];
  let dataArr = [];
  let candles = arr.data.candles?.reverse();

  if (isEchart) {
    candles?.forEach((item) => {
      dataArr = [...dataArr, [item[1], item[4], item[3], item[2]]];
      timeArr = [...timeArr, item[0]];
    });
  } else {
    candles?.forEach((item, i) => {
      const aa = item[0].split("T");
      const hhmmss = aa[1].split("+")[0];
      dataArr = [
        ...dataArr,
        {
          date: `${aa[0]} ${hhmmss}`,
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5],
        },
      ];
    });
  }

  return { dataArr, timeArr };
};

export const getIntradayDataForCurrentDay = async (
  candles,
  indexName,
  cmpnyObj
) => {
  if (hasOpened()) {
    const lastCandleDate = candles[candles.length - 1].date.split(" ")[0];
    const currentDate = new Date().toISOString().split("T")[0];

    if (lastCandleDate !== currentDate) {
      let currentObj;
      let currentHour = new Date().getHours();
      if (
        currentHour >= 18 &&
        (indexName === "NSE_EQ" || indexName === "NSE_INDEX")
      ) {
        let apiName = "historic";
        if (cmpnyObj.nseIndex) {
          apiName = "indexHistoric";
        }
        const arr1 = await getHistoricDataNSE(cmpnyObj.symbol, "1d", apiName);
        currentObj = arr1.candles[arr1.candles.length - 1];
      } else {
        const arr1 = await getIntradayData(
          "1minute",
          cmpnyObj.value,
          indexName
        );
        let candleData = arr1.data.candles?.reverse();
        if (candleData.length) {
          currentObj = getDataFromIntraday(candleData);
        }
      }

      if (currentObj) {
        let currentObjDate = currentObj.date.split("T")[0];
        if (
          currentObjDate === currentDate &&
          currentObjDate !== lastCandleDate
        ) {
          candles = [...candles, currentObj];
        }
      }
    }
  }
  return candles;
};
