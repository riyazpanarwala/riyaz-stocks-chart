import axios from "axios";
import { dateObj } from "./utils/data";

const baseurl = "https://api.upstox.com/v2/";
const nseBaseUrl = `/api/NSE/Equity`;

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

export const getHistoricDataNSE = async (symbol, isFrom) => {
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
    apiName: "historic",
  };

  try {
    const response = await axios.post(nseBaseUrl, payload, { headers });

    let candles = [];
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
  isFrom
) => {
  const headers = {
    Accept: "application/json",
  };
  const instrumentKey = `${indexName}|${companyName}`;
  let currentDate = new Date();
  let toDate = currentDate.toISOString().split("T")[0];
  let fromDate = dateObj[isFrom]();
  fromDate = fromDate.toISOString().split("T")[0];
  const newUrl = `${baseurl}historical-candle/${instrumentKey}/${interval}/${toDate}/${fromDate}`;

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getIntradayData = async (interval, companyName, indexName) => {
  const headers = {
    Accept: "application/json",
  };

  const instrumentKey = `${indexName}|${companyName}`;
  const newUrl = `${baseurl}historical-candle/intraday/${instrumentKey}/${interval}`;

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};
