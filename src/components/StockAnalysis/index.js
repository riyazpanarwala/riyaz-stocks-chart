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
  cci,
  sto,
  williamson,
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

const round2Decimal = (value) => {
  if (value) {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
  return "";
};

const getIntradayObj = async (symbol) => {
  const arr1 = await getHistoricDataNSE(symbol, "1d");
  return arr1.candles[arr1.candles.length - 1];
};

export const stockAnalysis = async (
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
  const sma5 = sma(candles, 5, "close");
  const sma10 = sma(candles, 10, "close");
  const sma20 = sma(candles, 20, "close");
  const sma50 = sma(candles, 50, "close");
  const sma100 = sma(candles, 100, "close");
  const sma200 = sma(candles, 200, "close");
  const ema50 = ema(candles, 50, true);
  const ema200 = ema(candles, 200, true);
  const mfiValues = mfi(candles, 14);
  const trend = supertrend(candles);
  const bolingerData = bb(candles);
  const bbband = bolingerData[bolingerData.length - 1].bb;
  const cciValues = cci(candles, 20);
  const stoVal = sto(candles, 20, 3);
  const williamson14 = williamson(candles, 14);

  return {
    "RSI(14)": round2Decimal(rsiValues[rsiValues.length - 1]),
    "MFI(14)": round2Decimal(mfiValues[mfiValues.length - 1].mfi),
    "CCI(20)": round2Decimal(cciValues[cciValues.length - 1].cci),
    "Williamson%R(14)": round2Decimal(
      williamson14[williamson14.length - 1].will
    ),
    "Stochastic(20,3)": {
      K: round2Decimal(stoVal[stoVal.length - 1].fullSTO.K),
      D: round2Decimal(stoVal[stoVal.length - 1].fullSTO.D),
    },
    "DAY ADX": round2Decimal(adx[adx.length - 1]),
    "DI+": plusDI[plusDI.length - 1],
    "DI-": minusDI[minusDI.length - 1],
    "DAY MACD(12,26,9)": round2Decimal(macdLine[macdLine.length - 1]),
    "DAY MACD SIGNAL": signalLine[signalLine.length - 1],
    "Day ATR": round2Decimal(atrValues[atrValues.length - 1]),
    "Day ROC(21)": round2Decimal(roc21[roc21.length - 1]),
    "Day ROC(125)": round2Decimal(roc125[roc125.length - 1]),
    "SMA(5)": round2Decimal(sma5[sma5.length - 1]),
    "SMA(10)": round2Decimal(sma10[sma10.length - 1]),
    "SMA(20)": round2Decimal(sma20[sma20.length - 1]),
    "SMA(50)": round2Decimal(sma50[sma50.length - 1]),
    "SMA(100)": round2Decimal(sma100[sma100.length - 1]),
    "SMA(200)": round2Decimal(sma200[sma200.length - 1]),
    "EMA(50)": round2Decimal(ema50[ema50.length - 1]),
    "EMA(200)": round2Decimal(ema200[ema200.length - 1]),
    lastClose: lastClose,
    percentChange,
    supertrend: trend,
    "Bolinger Band(20,2)": {
      UB: round2Decimal(bbband.top),
      LB: round2Decimal(bbband.bottom),
      SMA20: round2Decimal(bbband.middle),
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
