import { rsi, sma } from "react-financial-charts";
import { dmi } from "../indicator";

export const calculateRSI = (candles) => {
  const rsiCalculator = rsi()
    .options({ windowSize: 14 })
    .merge((d, c) => {
      d.rsi = c;
    });

  return rsiCalculator(candles);
};

export const calculateAverageVolume = (candles) => {
  const smaVolume20 = sma()
    .options({ windowSize: 20, sourcePath: "volume" })
    .merge((d, c) => {
      d.smaVolume20 = c;
    });

  return smaVolume20(candles);
};

export const calculateMovingAverage = (candles, windowSize, key) => {
  const smaCalc = sma()
    .options({ windowSize: windowSize })
    .merge((d, c) => {
      d[key] = c;
    });

  return smaCalc(candles);
};

export const multibagger = (candles1) => {
  const results = [];
  let candles = [];

  candles = calculateRSI(candles1);
  candles = calculateAverageVolume(candles);
  candles = calculateMovingAverage(candles, 200, "sma200");
  candles = calculateMovingAverage(candles, 50, "sma50");

  const { adx } = dmi(candles);

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    // Criteria 1: Sustained Uptrend (higher highs and higher lows)
    const isUptrend = current.high > prev.high && current.low > prev.low;

    // Criteria 2: Moving Average Crossover
    // 50-day MA
    // 200-day MA
    const isMovingAverageBullish = current.sma50 > current.sma200;

    // Criteria 3: Volume Spike
    // 20-day avg volume
    const isVolumeSpike = current.volume > current.smaVolume20 * 1.5;

    // Criteria 4: RSI Confirmation
    // 14-period RSI
    const isRSIBullish = current.rsi >= 50 && current.rsi <= 70;

    // Criteria 5: ADX Confirmation
    // 14-period ADX
    const isADXStrongTrend = adx[i] > 25;

    // Combine criteria
    if (
      isUptrend &&
      isMovingAverageBullish &&
      isVolumeSpike &&
      isRSIBullish &&
      isADXStrongTrend
    ) {
      results.push({ ...current, rsi, adx });
    }
  }

  return results;
};
