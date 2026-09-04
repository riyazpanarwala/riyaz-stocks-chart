import { isMarketOpen } from "./utils/indianstockmarket";
import {
  getIntradayData,
  getHistoricDataNSE,
  getHistoricData,
  getNSEDataYahooFinance,
} from "./getIntervalData";
import isYFinanceEnable from "./utils/isYFinanceEnable";

export const getDataFromIntraday = (intradayData) => {
  if (!Array.isArray(intradayData) || intradayData.length === 0) {
    return null;
  }

  let totalVolume = 0;
  let maxHigh = -Infinity;
  let minLow = Infinity;
  const len = intradayData.length;

  for (let i = 0; i < len; i++) {
    const candle = intradayData[i];
    const high = candle[2];
    const low = candle[3];
    const volume = candle[5] || 0;

    totalVolume += volume;
    if (high > maxHigh) maxHigh = high;
    if (low < minLow) minLow = low;
  }

  return {
    date: intradayData[0][0],
    open: intradayData[0][1],
    close: intradayData[len - 1][4],
    high: maxHigh !== -Infinity ? maxHigh : intradayData[0][2],
    low: minLow !== Infinity ? minLow : intradayData[0][3],
    volume: totalVolume,
  };
};

export const getCandleArr = (arr, isEchart) => {
  let timeArr = [];
  let dataArr = [];
  let candles = arr?.data?.candles ? [...arr.data.candles].reverse() : [];

  if (isEchart) {
    dataArr = candles.map((item) => [item[1], item[4], item[3], item[2]]);
    timeArr = candles.map((item) => item[0]);
  } else {
    dataArr = candles.map((item) => {
      const aa = String(item[0] || "").split("T");
      const hhmmss = aa[1] ? aa[1].split("+")[0] : "";
      return {
        date: `${aa[0]} ${hhmmss}`.trim(),
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5],
      };
    });
  }

  return { dataArr, timeArr };
};

export const getIntradayDataForCurrentDay = async (
  candles,
  indexName,
  cmpnyObj,
) => {
  const lastCandleDate = candles[candles.length - 1]?.date?.split(" ")[0];
  const currentDateIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  try {
    if (lastCandleDate !== currentDateIst) {
      let currentObj;
      const nowIst = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      const currentHour = nowIst.getHours();
      if (
        !cmpnyObj.upstoxOnly &&
        currentHour >= 18 &&
        (indexName === "NSE_EQ" || indexName === "NSE_INDEX")
      ) {
        let apiName = "historic";
        if (cmpnyObj.nseIndex) {
          apiName = "indexHistoric";
        }
        const arr1 = await getHistoricDataNSE(cmpnyObj.symbol, "0d", apiName);
        const candlesNSE = arr1?.candles ?? [];
        if (candlesNSE.length) {
          currentObj = candlesNSE[candlesNSE.length - 1];
        }
      } else {
        const arr1 = await getIntradayData(
          "minutes",
          cmpnyObj.value,
          indexName,
          1,
        );
        let candleData = (arr1?.data?.candles ?? []).reverse();
        if (candleData.length) {
          currentObj = getDataFromIntraday(candleData);
        }
      }

      if (currentObj) {
        const currentObjDate = String(currentObj.date).slice(0, 10);
        if (
          currentObjDate === currentDateIst &&
          currentObjDate !== lastCandleDate
        ) {
          candles = [...candles, currentObj];
        }
      }
    }
  } catch (e) {
    console.error("getIntradayDataForCurrentDay failed:", e);
  }

  return candles;
};

export const fetchHistoricData = async (
  isEchart,
  intervalVal,
  interval,
  indexName,
  period,
  companyObj,
  apiInterval = 1,
) => {
  if (!companyObj || (!companyObj.symbol && !companyObj.value && !companyObj.yahooSymbol)) {
    return { candles: [], timeArr: [] };
  }

  let arr;

  if (
    isYFinanceEnable &&
    (companyObj.yahooSymbol || indexName === "NSE_EQ")
  ) {
    const yahooTicker = companyObj.yahooSymbol || (companyObj.symbol ? `${companyObj.symbol}.NS` : null);
    if (!yahooTicker) {
      return { candles: [], timeArr: [] };
    }
    const rawData = await getNSEDataYahooFinance(
      yahooTicker,
      interval,
      period,
    );
    if (Array.isArray(rawData)) {
      // Reverse raw quotes array so getCandleArr's reverse() restores chronological order
      arr = {
        data: {
          candles: rawData
            .map((q) => [q.date, q.open, q.high, q.low, q.close, q.volume])
            .reverse(),
        },
      };
    } else {
      arr = rawData;
    }
  } else {
    arr = await getHistoricData(
      intervalVal,
      companyObj.value,
      indexName,
      period,
      apiInterval,
    );
  }

  let { dataArr, timeArr } = getCandleArr(arr, isEchart);

  const shouldFetchLiveCandle = companyObj.global ? true : isMarketOpen();

  if (intervalVal === "days" && shouldFetchLiveCandle && !isEchart && !isYFinanceEnable) {
    dataArr = await getIntradayDataForCurrentDay(
      dataArr,
      indexName,
      companyObj,
    );
  }

  return {
    candles: dataArr,
    timeArr,
  };
};
