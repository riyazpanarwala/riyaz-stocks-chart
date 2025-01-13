import { getHistoricData } from "../getIntervalData.js";
import { multibagger } from "../financeChart/Pattern";
import {
  dmi,
  rsi,
  volumeBreakout,
  supportResistanceBreakout,
} from "../financeChart/indicator";
import fs from "fs";
// const { saveAs } = require("file-saver");

const stockAnalysis = async (
  interval,
  companyName,
  indexName,
  isFrom,
  isVolumeBreak,
  isSupportBreak,
  isMultibagger
) => {
  const arr = await getHistoricData(interval, companyName, indexName, isFrom);
  const dataArr = arr.data.candles?.reverse();

  let candles = [];
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

  const rsiValues = rsi(candles, 14);
  const { plusDI, minusDI, adx } = dmi(candles, 14);

  return {
    rsi: rsiValues[rsiValues.length - 1],
    adx: adx[adx.length - 1],
    "DI+": plusDI[plusDI.length - 1],
    "DI-": minusDI[minusDI.length - 1],
    volumeBreak: isVolumeBreak ? volumeBreakout(candles) : [],
    supportBreak: isSupportBreak ? supportResistanceBreakout(candles) : [],
    multibagger: isMultibagger ? multibagger(candles) : [],
  };
};

const aa = [
  { name: "JPPOWER", ISIN: "INE351F01018", isBSE: false },
  { name: "MAZDOCK", ISIN: "INE249Z01020", isBSE: false },
  { name: "NHPC", ISIN: "INE848E01016", isBSE: false },
  { name: "COALINDIA", ISIN: "INE522F01014", isBSE: false },
  { name: "IRFC", ISIN: "INE053F01010", isBSE: false },
  { name: "ONGC", ISIN: "INE213A01029", isBSE: false },
  { name: "RPOWER", ISIN: "INE614G01033", isBSE: false },
  { name: "SUZLON", ISIN: "INE040H01021", isBSE: false },
  { name: "SEPC", ISIN: "INE964H01014", isBSE: false },
  { name: "BPCL", ISIN: "INE029A01011", isBSE: false },
  { name: "GTLINFRA", ISIN: "INE221H01019", isBSE: false },
  { name: "VEDANTA", ISIN: "INE205A01025", isBSE: false },
  { name: "BEL", ISIN: "INE263A01024", isBSE: false },
  { name: "NBCC", ISIN: "INE095N01031", isBSE: false },
  { name: "SRESTHAFINVEST", ISIN: "INE606K01049", isBSE: true },
];

const saveFile = (jsonObj) => {
  const fileName = `myData-${new Date().getTime()}.json`;
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

const stocksAnalysis = () => {
  const jsonObj = {};

  aa.forEach(async (item, i) => {
    const data = await stockAnalysis(
      "day",
      item.ISIN,
      item.isBSE ? "BSE_EQ" : "NSE_EQ",
      "1y",
      true,
      true,
      true
    );

    jsonObj[item.name] = data;

    if (aa.length === Object.keys(jsonObj).length) {
      saveFile(jsonObj);
    }
  });
};

/*
const bb = () => {
  const total = intradayData.reduce((sum, candle) => sum + candle.volume, 0);

  const maxValue = Math.max.apply(
    Math,
    intradayData.map(function (d) {
      return d.high;
    })
  );
  const minValue = Math.min.apply(
    Math,
    intradayData.map(function (d) {
      return d.low;
    })
  );

  const dayData = {
    date: intradayData[0].date.split(" ")[0],
    open: intradayData[0].open,
    close: intradayData[intradayData.length - 1].close,
    high: maxValue,
    low: minValue,
    volume: total,
  };
  console.log(dayData);
};

bb();
*/

stocksAnalysis();

// export default stocksAnalysis;
