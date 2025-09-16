import axios from "axios";
import { dateObj } from "./utils/data";

const baseurl = "https://api.upstox.com/v3/";
const nseBaseUrl = `/api/NSE/Equity`;

export const getNSEDataYahooFinance = async (symbol, interval, isFrom) => {
  const headers = {
    Accept: "application/json",
  };

  let fromDate = dateObj[isFrom]();
  fromDate = fromDate.toISOString().split("T")[0];

  try {
    const response = await axios.get(
      `/api/finance?symbol=${symbol}&interval=${interval}&fromDate=${fromDate}`,
      { headers }
    );
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getNSEData = async (apiName, symbol) => {
  const headers = {
    Accept: "application/json",
  };

  const payload = {
    symbol,
    apiName,
  };

  try {
    const response = await axios.post(nseBaseUrl, payload, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getUniqueListBy = (arr, key) => {
  return [...new Map(arr.map((item) => [item[key], item])).values()];
};

export const getOptionChainData = async (symbol, apiName = "optionChain") => {
  const headers = {
    Accept: "application/json",
  };

  const payload = {
    symbol,
    apiName,
  };

  try {
    const response = await axios.post(nseBaseUrl, payload, { headers });

    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getHistoricDataNSE = async (
  symbol,
  isFrom,
  apiName = "historic"
) => {
  const headers = {
    Accept: "application/json",
  };

  let currentDate = new Date();
  let toDate = currentDate.toISOString().split("T")[0];
  let fromDate = dateObj[isFrom]();
  fromDate = fromDate.toISOString().split("T")[0];

  const payload = {
    fromDate,
    toDate,
    symbol,
    apiName,
  };

  try {
    const response = await axios.post(nseBaseUrl, payload, { headers });

    let candles = [];

    if (apiName === "historic") {
      response.data.forEach((v1) => {
        v1.data?.reverse().forEach((v) => {
          candles = [
            ...candles,
            {
              high: v.CH_TRADE_HIGH_PRICE,
              low: v.CH_TRADE_LOW_PRICE,
              open: v.CH_OPENING_PRICE,
              close: v.CH_CLOSING_PRICE,
              volume: v.CH_TOT_TRADED_QTY,
              date: v.CH_TIMESTAMP,
            },
          ];
        });
      });
    } else {
      response.data.forEach((v1) => {
        let newArr = getUniqueListBy(
          v1.data.indexCloseOnlineRecords,
          "EOD_TIMESTAMP"
        );
        newArr.forEach((v, i) => {
          candles = [
            ...candles,
            {
              high: v.EOD_HIGH_INDEX_VAL,
              low: v.EOD_LOW_INDEX_VAL,
              open: v.EOD_OPEN_INDEX_VAL,
              close: v.EOD_CLOSE_INDEX_VAL,
              volume: v1.data.indexTurnoverRecords[i]?.HIT_TRADED_QTY,
              date: v.EOD_TIMESTAMP,
            },
          ];
        });
      });
    }

    return { candles };
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getHistoricData = async (
  interval,
  companyName,
  indexName,
  isFrom,
  apiInterval = 1
) => {
  const headers = {
    Accept: "application/json",
  };
  const instrumentKey = `${indexName}|${companyName}`;
  let currentDate = new Date();
  let toDate = currentDate.toISOString().split("T")[0];
  let fromDate = dateObj[isFrom]();
  fromDate = fromDate.toISOString().split("T")[0];

  const newUrl = `${baseurl}historical-candle/${instrumentKey}/${interval}/${apiInterval}/${toDate}/${fromDate}`;

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getIntradayData = async (
  interval,
  companyName,
  indexName,
  apiInterval = 1
) => {
  const headers = {
    Accept: "application/json",
  };

  const instrumentKey = `${indexName}|${companyName}`;
  const newUrl = `${baseurl}historical-candle/intraday/${instrumentKey}/${interval}/${apiInterval}`;

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getMarketTimings = async () => {
  const headers = {
    Accept: "application/json",
  };

  const todayDate = new Date().toISOString().split("T")[0];
  const newUrl = `${baseurl}market/timings/${todayDate}`;

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};
