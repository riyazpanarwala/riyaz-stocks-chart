import { saveAs } from "file-saver";
import watchlistArray from "../utils/watchListArr";
import { fetchHistoricData } from "../common";
import getStockAnalysis from "./getStockAnalysis";
// import fs from "fs";

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const isNSEApi = false;

export const stockAnalysis = async (
  interval,
  isFrom,
  companyName,
  indexName,
  symbol,
  isNseIndex
) => {
  const companyObj = {
    nseIndex: isNseIndex,
    symbol: symbol,
    yahooSymbol: "",
    value: companyName,
  };

  const { candles } = await fetchHistoricData(
    false,
    interval,
    "1d",
    indexName,
    isFrom,
    companyObj
  );

  console.log(symbol);
  const {
    lastClose,
    percentChange,
    rsi,
    mfi,
    cci,
    willR,
    sto,
    adx,
    plusDI,
    minusDI,
    macdLine,
    signalLine,
    atr,
    roc20,
    roc125,
    sma5,
    sma10,
    sma20,
    sma50,
    sma100,
    sma200,
    ema50,
    ema200,
    supertrend,
    bb,
    shortTermMACross,
    mediumTermMACross,
    longTermMACross,
  } = getStockAnalysis(candles);

  return {
    "RSI(14)": rsi,
    "MFI(14)": mfi,
    "CCI(20)": cci,
    "Williamson%R(14)": willR,
    "Stochastic(20,3)": sto,
    "DAY ADX": adx,
    "DI+": plusDI,
    "DI-": minusDI,
    "DAY MACD(12,26,9)": macdLine,
    "DAY MACD SIGNAL": signalLine,
    "Day ATR": atr,
    "Day ROC(20)": roc20,
    "Day ROC(125)": roc125,
    "SMA(5)": sma5,
    "SMA(10)": sma10,
    "SMA(20)": sma20,
    "SMA(50)": sma50,
    "SMA(100)": sma100,
    "SMA(200)": sma200,
    "shortTermMACross(5,20)": shortTermMACross,
    "mediumTermMACross(20,50)": mediumTermMACross,
    "longTermMACross(50,200)": longTermMACross,
    "EMA(50)": ema50,
    "EMA(200)": ema200,
    lastClose: lastClose,
    percentChange,
    supertrend: supertrend,
    "Bolinger Band(20,2)": bb,
  };
};

const watchlistArray1 = watchlistArray("");

const saveFile = (jsonObj) => {
  const b = new Date().toJSON().split("T");
  const fileName = `myData-${b[0]}-${b[1]
    .split(".")[0]
    .replaceAll(":", "_")}.json`;
  // Create a blob of the data
  const fileToSave = new Blob([JSON.stringify(jsonObj)], {
    type: "application/json",
  });

  // Save the file
  saveAs(fileToSave, fileName);

  /*
  const fileToSave = JSON.stringify(jsonObj, null, 2);

  fs.writeFile(fileName, fileToSave, "utf8", (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("Data written to file");
    }
  });
  */
};

const stocksAnalysis = async (arrObj = watchlistArray1) => {
  const jsonObj = [];

  const analyse = async (item, i) => {
    const data = await stockAnalysis(
      "day",
      "1y",
      item.value,
      item.indexName,
      item.symbol,
      item.nseIndex
    );

    data.name = item.label;
    jsonObj.push(data);

    if (arrObj.length === jsonObj.length) {
      saveFile(jsonObj.sort((a, b) => b.percentChange - a.percentChange));
    }
  };

  for (let i = 0; i < arrObj.length; i = i + 5) {
    arrObj.slice(i, i + 5).forEach(analyse);
    await sleep(2000);
  }
};

export default stocksAnalysis;
