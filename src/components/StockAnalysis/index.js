import {
  getHistoricData,
  getIntradayData,
  getHistoricDataNSE,
} from "../getIntervalData.js";
import { multibagger } from "../financeChart/Pattern";
import {
  dmi,
  rsi,
  macd,
  atr,
  roc,
  sma,
  ema,
  volumeBreakout,
  supportResistanceBreakout,
} from "../financeChart/indicator";
import fs from "fs";
// const { saveAs } = require("file-saver");

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const getDayDataFromIntraday = (intradayData) => {
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
    date: intradayData[0][0].split("T")[0],
    open: intradayData[0][1],
    close: intradayData[intradayData.length - 1][4],
    high: maxValue,
    low: minValue,
    volume: total,
  };
};

const getIntradayObj = async (companyName, indexName) => {
  const arr1 = await getIntradayData("30minute", companyName, indexName);
  return getDayDataFromIntraday(arr1.data.candles?.reverse());
};

const stockAnalysis = async (
  interval,
  companyName,
  indexName,
  isFrom,
  symbol,
  isVolumeBreak,
  isSupportBreak,
  isMultibagger
) => {
  let candles = [];
  let arr = [];

  if (interval === "day" && indexName === "NSE_EQ" && false) {
    arr = await getHistoricDataNSE(symbol, isFrom);
    candles = arr.candles;
  } else {
    arr = await getHistoricData(interval, companyName, indexName, isFrom);
    const dataArr = arr.data.candles?.reverse();

    dataArr?.forEach((item, i) => {
      const aa = item[0].split("T");
      const hhmmss = aa[1].split("+")[0];
      candles = [
        ...candles,
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

    const currentObj = await getIntradayObj(companyName, indexName);
    candles = [...candles, currentObj];
  }
  console.log(symbol);
  const lastClose = candles[candles.length - 1].close;
  const prevlastClose = candles[candles.length - 2].close;
  const percentChange = ((lastClose - prevlastClose) * 100) / prevlastClose;

  const rsiValues = rsi(candles, 14);
  const { plusDI, minusDI, adx } = dmi(candles, 14);
  const { macdLine, signalLine } = macd(candles);
  const atrValues = atr(candles);
  const roc21 = roc(candles, 21);
  const roc125 = roc(candles, 125);
  const sma50 = sma(candles, 50, "close");
  const sma200 = sma(candles, 200, "close");
  const ema50 = ema(candles, 50, true);
  const ema200 = ema(candles, 200, true);

  return {
    "RSI(14)": rsiValues[rsiValues.length - 1],
    "DAY ADX": adx[adx.length - 1],
    "DI+": plusDI[plusDI.length - 1],
    "DI-": minusDI[minusDI.length - 1],
    volumeBreak: isVolumeBreak ? volumeBreakout(candles) : [],
    supportBreak: isSupportBreak ? supportResistanceBreakout(candles) : [],
    multibagger: isMultibagger ? multibagger(candles) : [],
    "DAY MACD(12,26,9)": macdLine[macdLine.length - 1],
    "DAY MACD SIGNAL": signalLine[signalLine.length - 1],
    "Day ATR": atrValues[atrValues.length - 1],
    "Day ROC(21)": roc21[roc21.length - 1],
    "Day ROC(125)": roc125[roc125.length - 1],
    "SMA(50)": sma50[sma50.length - 1],
    "SMA(200)": sma200[sma200.length - 1],
    "EMA(50)": ema50[ema50.length - 1],
    "EMA(200)": ema200[ema200.length - 1],
    lastClose: lastClose,
    percentChange,
  };
};

const aa = [
  { name: "JPPOWER", symbol: "JPPOWER", ISIN: "INE351F01018", isBSE: false },
  { name: "MAZDOCK", symbol: "MAZDOCK", ISIN: "INE249Z01020", isBSE: false },
  { name: "NHPC", symbol: "NHPC", ISIN: "INE848E01016", isBSE: false },
  {
    name: "COALINDIA",
    symbol: "COALINDIA",
    ISIN: "INE522F01014",
    isBSE: false,
  },
  { name: "IRFC", symbol: "IRFC", ISIN: "INE053F01010", isBSE: false },
  { name: "ONGC", symbol: "ONGC", ISIN: "INE213A01029", isBSE: false },
  { name: "RPOWER", symbol: "RPOWER", ISIN: "INE614G01033", isBSE: false },
  { name: "SUZLON", symbol: "SUZLON", ISIN: "INE040H01021", isBSE: false },
  { name: "SEPC", symbol: "SEPC", ISIN: "INE964H01014", isBSE: false },
  { name: "BPCL", symbol: "BPCL", ISIN: "INE029A01011", isBSE: false },
  { name: "GTLINFRA", symbol: "GTLINFRA", ISIN: "INE221H01019", isBSE: false },
  { name: "VEDANTA", symbol: "VEDL", ISIN: "INE205A01025", isBSE: false },
  { name: "BEL", symbol: "BEL", ISIN: "INE263A01024", isBSE: false },
  { name: "NBCC", symbol: "NBCC", ISIN: "INE095N01031", isBSE: false },
  { name: "SRESTHAFINVEST", ISIN: "INE606K01049", isBSE: true },
];

const saveFile = (jsonObj) => {
  const b = new Date().toJSON().split("T");
  const fileName = `myData-${b[0]}-${b[1]
    .split(".")[0]
    .replaceAll(":", "_")}.json`;
  // Create a blob of the data
  // const fileToSave = new Blob([JSON.stringify(jsonData)], {
  //  type: "application/json",
  //});

  // Save the file
  // saveAs(fileToSave, fileName);

  const fileToSave = JSON.stringify(jsonObj, null, 2);

  fs.writeFile(fileName, fileToSave, "utf8", (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("Data written to file");
    }
  });
};

const stocksAnalysis = async () => {
  const jsonObj = {};

  const analyse = async (item, i) => {
    const data = await stockAnalysis(
      "day",
      item.ISIN,
      item.isBSE ? "BSE_EQ" : "NSE_EQ",
      "1y",
      item.symbol,
      false,
      false,
      false
    );

    jsonObj[item.name] = data;

    if (aa.length === Object.keys(jsonObj).length) {
      saveFile(jsonObj);
    }
  };

  aa.slice(0, 5).forEach(analyse);
  await sleep(2000);
  aa.slice(5, 10).forEach(analyse);
  await sleep(2000);
  aa.slice(10, 15).forEach(analyse);
};

stocksAnalysis();

// export default stocksAnalysis;
