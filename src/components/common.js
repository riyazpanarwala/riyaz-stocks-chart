import { hasOpened } from "./utils/indianstockmarket";
import {
  getIntradayData,
  getHistoricDataNSE,
  getHistoricData,
  getNSEDataYahooFinance,
  // getNSEData,
} from "./getIntervalData";
import isYFinanceEnable from "./utils/isYFinanceEnable";
import { calculateChandelierExit } from "./Chandelier/CEanalysis";

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
  const lastCandleDate = candles[candles.length - 1]?.date?.split(" ")[0];
  const currentDateIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  try {
    if (lastCandleDate !== currentDateIst) {
      let currentObj;
      const nowIst = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const currentHour = nowIst.getHours();
      if (
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
          1
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

const isCallNSE = false;

export const fetchHistoricData = async (
  isEchart,
  intervalVal,
  interval,
  indexName,
  period,
  companyObj,
  apiInterval = 1
) => {
  let candleArr = [];
  let times = [];

  if (
    isCallNSE &&
    intervalVal === "days" &&
    (indexName === "NSE_EQ" || indexName === "NSE_INDEX")
  ) {
    let apiName = "historic";
    if (companyObj.nseIndex) {
      apiName = "indexHistoric";
    }
    const { candles } = await getHistoricDataNSE(
      companyObj.symbol,
      period,
      apiName
    );
    candleArr = candles;

    // getNSEData("F&O", "NIFTY");
    // getNSEData("corporateInfo", companyObj.symbol);
    // getNSEData("details", companyObj.symbol);
    // getNSEData("tradeInfo", companyObj.symbol);
  } else {
    if (
      isYFinanceEnable &&
      (companyObj.yahooSymbol || indexName === "NSE_EQ")
    ) {
      candleArr = await getNSEDataYahooFinance(
        companyObj.yahooSymbol || companyObj.symbol + ".NS",
        interval,
        period
      );
    } else {
      const arr = await getHistoricData(
        intervalVal,
        companyObj.value,
        indexName,
        period,
        apiInterval
      );
      let { dataArr, timeArr } = getCandleArr(arr, isEchart);
      if (intervalVal === "days" && hasOpened() && !isEchart) {
        dataArr = await getIntradayDataForCurrentDay(
          dataArr,
          indexName,
          companyObj
        );
      }

      candleArr = dataArr;
      times = timeArr;
    }
  }

  const ceData = calculateChandelierExit(
    candleArr,
    22,   // lookback
    3     // ATR multiplier
  );
  // Latest CE value
  const last = ceData[ceData.length - 1];
  console.log("CE:", last.ce, "Trend:", last.trend, "Signal:", last.signal, "at", last.date);
  // When will be the last trade signal change?
  const lastTradeSignalChange = ceData.findLast((item) => item.signal !== null);
  console.log("Last trade signal change:", lastTradeSignalChange);

  return {
    candles: candleArr,
    timeArr: times,
  };
};
