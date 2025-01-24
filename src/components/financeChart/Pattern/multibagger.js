// import { rsi, sma } from "@riyazpanarwala/indicators";
import { dmi, sma, rsi } from "../indicator";

/*
export const calculateRSI1 = (candles) => {
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
*/

export const multibagger = (candles) => {
  const results = [];

  // candles = calculateRSI1(candles1);
  // candles = calculateAverageVolume(candles);
  // candles = calculateMovingAverage(candles, 200, "sma200");
  // candles = calculateMovingAverage(candles, 50, "sma50");

  const sma50 = sma(candles, 50, "close");
  const sma200 = sma(candles, 200, "close");
  const smaVolume20 = sma(candles, 20, "volume");
  const rsiValues = rsi(candles);

  const { adx } = dmi(candles);

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    // Criteria 1: Sustained Uptrend (higher highs and higher lows)
    const isUptrend = current.high > prev.high && current.low > prev.low;

    // Criteria 2: Moving Average Crossover
    // 50-day MA
    // 200-day MA
    const isMovingAverageBullish = sma50[i] > sma200[i];

    // Criteria 3: Volume Spike
    // 20-day avg volume
    const isVolumeSpike = current.volume > smaVolume20[i] * 1.5;

    // Criteria 4: RSI Confirmation
    // 14-period RSI
    const isRSIBullish = rsiValues[i] >= 50 && rsiValues[i] <= 70;

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
      results.push({ ...current, rsi: rsiValues[i], adx: adx[i] });
    }
  }

  return results;
};
