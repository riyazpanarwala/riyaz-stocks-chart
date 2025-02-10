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
  mfi,
  supertrend,
  bb,
} from "../financeChart/indicator";
import { saveAs } from "file-saver";
import watchlistArray from "../utils/watchListArr";
// import fs from "fs";

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const getIntradayObj = async (symbol) => {
  const arr1 = await getHistoricDataNSE(symbol, "1d");
  return arr1.candles[arr1.candles.length - 1];
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

    if (indexName === "NSE_EQ") {
      const currentObj = await getIntradayObj(symbol);
      const currentDate = new Date().toISOString().split("T")[0];
      const lastCandleDate = candles[candles.length - 1].date.split(" ")[0];
      if (
        currentObj.date === currentDate &&
        currentObj.date !== lastCandleDate
      ) {
        candles = [...candles, currentObj];
      }
    }
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
  const mfiValues = mfi(candles, 14);
  const trend = supertrend(candles);
  const bolingerData = bb(candles);
  const bbband = bolingerData[bolingerData.length - 1].bb;

  return {
    "RSI(14)": rsiValues[rsiValues.length - 1],
    "MFI(14)": mfiValues[mfiValues.length - 1].mfi,
    "DAY ADX": adx[adx.length - 1],
    "DI+": plusDI[plusDI.length - 1],
    "DI-": minusDI[minusDI.length - 1],
    // volumeBreak: isVolumeBreak ? volumeBreakout(candles) : [],
    // supportBreak: isSupportBreak ? supportResistanceBreakout(candles) : [],
    // multibagger: isMultibagger ? multibagger(candles) : [],
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
    supertrend: trend,
    "Bolinger Band(20,2)": {
      UB: bbband.top,
      LB: bbband.bottom,
      SMA20: bbband.middle,
    },
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

const stocksAnalysis = async (arrObj = watchlistArray1, indexVal) => {
  const jsonObj = [];

  const analyse = async (item, i) => {
    const data = await stockAnalysis(
      "day",
      item.value,
      indexVal || item.indexName,
      "1y",
      item.symbol,
      false,
      false,
      false
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

// stocksAnalysis();

export default stocksAnalysis;
