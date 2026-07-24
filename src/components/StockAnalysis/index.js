import { saveAs } from "file-saver";
import watchlistArray from "../utils/watchListArr";
import { fetchHistoricData } from "../common";
import getStockAnalysis from "./getStockAnalysis";
import {
  getRSIIndication,
  getMACDIndication,
  getCCIIndication,
  getWilliamsonIndication,
  getROC20Indication,
  getStochasticIndication,
  getMFIIndication,
  getADXIndication,
  getATRIndication,
} from "./indication";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error(`Insufficient candle history for ${symbol}`);
  }

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
    atrSma,
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
    "RSI(14)": `${rsi} (${getRSIIndication(rsi)})`,
    "MFI(14)": `${mfi} (${getMFIIndication(mfi)})`,
    "CCI(20)": `${cci} (${getCCIIndication(cci)})`,
    "Williamson%R(14)": `${willR} (${getWilliamsonIndication(willR)})`,
    "Stochastic(20,3)": `${sto} (${getStochasticIndication(sto)})`,
    "DAY ADX": `${adx} (${getADXIndication(adx)})`,
    "Day ATR": `${atr} (${getATRIndication(atr, atrSma)})`,
    "Day ROC(20)": `${roc20} (${getROC20Indication(roc20)})`,
    "Day ROC(125)": roc125,
    "DAY MACD(12,26,9)": `${macdLine} (${getMACDIndication(
      macdLine,
      signalLine
    )})`,
    "DAY MACD SIGNAL": signalLine,
    "DI+": plusDI,
    "DI-": minusDI,
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
    lastClose,
    percentChange,
    supertrend,
    "Bolinger Band(20,2)": bb,
  };
};

const watchlistArray1 = watchlistArray("");

const saveFile = (jsonObj) => {
  const dateStr = new Date().toISOString().split("T")[0];
  const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "_");
  const fileName = `stockAnalysis-${dateStr}-${timeStr}.json`;
  
  const fileToSave = new Blob([JSON.stringify(jsonObj, null, 2)], {
    type: "application/json",
  });

  saveAs(fileToSave, fileName);
};

const stocksAnalysis = async (arrObj = watchlistArray1) => {
  const jsonObj = [];

  const analyse = async (item) => {
    try {
      const data = await stockAnalysis(
        "days",
        "1y",
        item.value,
        item.indexName,
        item.symbol,
        item.nseIndex
      );

      data.name = item.label;
      jsonObj.push(data);
    } catch (err) {
      console.error(`Failed analysis for ${item.label}:`, err);
    }
  };

  for (let i = 0; i < arrObj.length; i += 5) {
    const chunk = arrObj.slice(i, i + 5);
    await Promise.all(chunk.map((item) => analyse(item)));
    await sleep(2000);
  }

  if (jsonObj.length > 0) {
    saveFile(jsonObj.sort((a, b) => (b.percentChange || 0) - (a.percentChange || 0)));
  }

  return {
    total: arrObj.length,
    successful: jsonObj.length,
    failed: arrObj.length - jsonObj.length,
  };
};

export default stocksAnalysis;
