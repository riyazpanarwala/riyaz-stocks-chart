import {
  getIntradayData,
  getHistoricData,
  getNSEDataYahooFinance,
} from "./getIntervalData.js";
import isYFinanceEnable from "./utils/isYFinanceEnable.js";
import { getFinanceDataAction } from "../app/actions/finance.js";
import { mergeCorporateActions } from "./utils/corporateActions.js";

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

  const dateStr = String(intradayData[0][0] || "").split("T")[0];

  return {
    date: `${dateStr} 00:00:00`,
    open: intradayData[0][1],
    close: intradayData[len - 1][4],
    high: maxHigh !== -Infinity ? maxHigh : intradayData[0][2],
    low: minLow !== Infinity ? minLow : intradayData[0][3],
    volume: totalVolume,
  };
};

/**
 * Transforms candle arrays into structured candle objects,
 * preserving all mapped corporate action events.
 *
 * @param {object} arr - Raw candle wrapper object
 * @returns {{ dataArr: Array<object> }} Formatted candles
 */
export const getCandleArr = (arr) => {
  const candles = arr?.data?.candles ? [...arr.data.candles].reverse() : [];

  const dataArr = candles.map((item) => {
    const aa = String(item[0] || "").split("T");
    const hhmmss = aa[1] ? aa[1].split("+")[0] : "";

    const rawDividends = item[6];
    const rawSplits = item[7];

    const dividends = Array.isArray(rawDividends)
      ? rawDividends
      : rawDividends
      ? [rawDividends]
      : null;

    const splits = Array.isArray(rawSplits)
      ? rawSplits
      : rawSplits
      ? [rawSplits]
      : null;

    return {
      date: `${aa[0]} ${hhmmss}`.trim(),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
      dividend: dividends?.[0] ?? null,
      split: splits?.[0] ?? null,
      dividends: dividends ?? null,
      splits: splits ?? null,
    };
  });

  return { dataArr };
};

export const getIntradayDataForCurrentDay = async (
  candles,
  indexName,
  cmpnyObj,
) => {
  candles = Array.isArray(candles) ? candles : [];

  const currentDateIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const lastCandleDate = candles[candles.length - 1]?.date?.split(" ")[0];

  try {
    const arr1 = await getIntradayData(
      "minutes",
      cmpnyObj.value,
      indexName,
      1,
    );
    const candleData = (arr1?.data?.candles ?? []).slice().reverse();
    if (!candleData.length) return candles;

    // Filter to ensure candles belong to today's session in IST
    const todayCandles = candleData.filter(
      (c) => String(c[0] || "").split("T")[0] === currentDateIst
    );
    if (!todayCandles.length) return candles;

    const currentObj = getDataFromIntraday(todayCandles);
    if (!currentObj) return candles;

    const currentObjDate = String(currentObj.date).split(" ")[0];

    if (currentObjDate === currentDateIst) {
      if (lastCandleDate === currentDateIst) {
        // Today's candle already exists in array; update it with latest intraday data
        candles = [...candles.slice(0, -1), currentObj];
      } else {
        // Append today's candle to historical candles
        candles = [...candles, currentObj];
      }
    }
  } catch (e) {
    console.error("getIntradayDataForCurrentDay failed:", e);
  }

  return candles;
};

/**
 * Fetches historical candle data from Yahoo Finance or NSE/Upstox adapters,
 * mapping corporate actions onto the resulting candle series.
 *
 * @param {string} intervalVal - Interval unit ("minutes", "hours", "days", etc.)
 * @param {string} interval - Granularity code ("1d", "1wk", "1mo", etc.)
 * @param {string} indexName - Index / segment identifier
 * @param {string} period - Historical period span ("1y", "5y", "Max", etc.)
 * @param {object} companyObj - Selected stock object
 * @param {number} [apiInterval] - Custom interval multiplier
 * @returns {Promise<{ candles: Array<object> }>}
 */
export const fetchHistoricData = async (
  intervalVal,
  interval,
  indexName,
  period,
  companyObj,
  apiInterval = 1,
) => {
  if (!companyObj || (!companyObj.symbol && !companyObj.value && !companyObj.yahooSymbol)) {
    return { candles: [] };
  }

  let arr;

  if (
    isYFinanceEnable &&
    (companyObj.yahooSymbol || indexName === "NSE_EQ")
  ) {
    const yahooTicker = companyObj.yahooSymbol || (companyObj.symbol ? `${companyObj.symbol}.NS` : null);
    if (!yahooTicker) {
      return { candles: [] };
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
            .map((q) => [
              q.date,
              q.open,
              q.high,
              q.low,
              q.close,
              q.volume,
              q.dividends ?? (q.dividend ? [q.dividend] : null),
              q.splits ?? (q.split ? [q.split] : null),
            ])
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

  let { dataArr } = getCandleArr(arr);

  if (intervalVal === "days" && !isYFinanceEnable) {
    dataArr = await getIntradayDataForCurrentDay(
      dataArr,
      indexName,
      companyObj,
    );
  }

  if (!isYFinanceEnable && indexName === "NSE_EQ" && companyObj.symbol && dataArr.length) {
    try {
      const events = await getFinanceDataAction({
        symbol: companyObj.yahooSymbol || `${companyObj.symbol}.NS`,
        corporateActionsOnly: true,
        fromDate: dataArr[0].date.slice(0, 10),
      });
      if (events?.error) {
        console.error("Corporate actions could not be loaded:", events.error);
      } else {
        dataArr = mergeCorporateActions(dataArr, events, interval);
      }
    } catch (error) {
      console.error("Corporate actions could not be loaded:", error);
    }
  }

  return {
    candles: dataArr,
  };
};
