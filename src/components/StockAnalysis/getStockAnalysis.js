import {
  dmi,
  rsi,
  macd,
  atr,
  roc,
  sma,
  ema,
  mfi,
  supertrend,
  bb,
  cci,
  calculateStochastic,
  williamson,
  crossover,
} from "../financeChart/indicator";

const round2Decimal = (value) => {
  if (value) {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
  return "";
};

const getStockAnalysis = (candles) => {
  const lastClose = candles[candles.length - 1].close;
  const prevlastClose = candles[candles.length - 2].close;
  const percentChange = ((lastClose - prevlastClose) * 100) / prevlastClose;

  const rsiValues = rsi(candles, 14);
  const { plusDI, minusDI, adx } = dmi(candles, 14);
  const { macdLine, signalLine } = macd(candles);
  const atrValues = atr(candles);
  const roc20 = roc(candles, 20);
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
  const stoVal = calculateStochastic(candles, 20, 3);
  const williamson14 = williamson(candles, 14);
  const shortTermMACross = crossover(sma5, sma20);
  const mediumTermMACross = crossover(sma20, sma50);
  const longTermMACross = crossover(sma50, sma200);
  const atrSma = sma(atrValues, 9, "");

  return {
    rsi: round2Decimal(rsiValues[rsiValues.length - 1]),
    mfi: round2Decimal(mfiValues[mfiValues.length - 1].mfi),
    cci: round2Decimal(cciValues[cciValues.length - 1].cci),
    willR: round2Decimal(williamson14[williamson14.length - 1].will),
    sto: round2Decimal(stoVal.fastKValues[stoVal.fastKValues.length - 1]),
    adx: round2Decimal(adx[adx.length - 1]),
    plusDI: plusDI[plusDI.length - 1],
    minusDI: minusDI[minusDI.length - 1],
    macdLine: round2Decimal(macdLine[macdLine.length - 1]),
    signalLine: round2Decimal(signalLine[signalLine.length - 1]),
    atr: round2Decimal(atrValues[atrValues.length - 1]),
    atrSma: round2Decimal(atrSma[atrSma.length - 1]),
    roc20: round2Decimal(roc20[roc20.length - 1]),
    roc125: round2Decimal(roc125[roc125.length - 1]),
    sma5: round2Decimal(sma5[sma5.length - 1]),
    sma10: round2Decimal(sma10[sma10.length - 1]),
    sma20: round2Decimal(sma20[sma20.length - 1]),
    sma50: round2Decimal(sma50[sma50.length - 1]),
    sma100: round2Decimal(sma100[sma100.length - 1]),
    sma200: round2Decimal(sma200[sma200.length - 1]),
    shortTermMACross: shortTermMACross[shortTermMACross.length - 1]?.type,
    mediumTermMACross: mediumTermMACross[mediumTermMACross.length - 1]?.type,
    longTermMACross: longTermMACross[longTermMACross.length - 1]?.type,
    ema50: round2Decimal(ema50[ema50.length - 1]),
    ema200: round2Decimal(ema200[ema200.length - 1]),
    lastClose: lastClose,
    percentChange,
    supertrend: trend,
    bb: {
      UB: round2Decimal(bbband.top),
      LB: round2Decimal(bbband.bottom),
      SMA20: round2Decimal(bbband.middle),
    },
  };
};

export default getStockAnalysis;
