import { rsi } from "react-financial-charts";

export const calculateADX = (candles, index, period) => {
  if (index < period) return null; // Not enough data

  const plusDM = [];
  const minusDM = [];
  const tr = [];

  for (let i = index - period + 1; i <= index; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      )
    );
  }

  const avgPlusDM = plusDM.reduce((a, b) => a + b, 0) / period;
  const avgMinusDM = minusDM.reduce((a, b) => a + b, 0) / period;
  const avgTR = tr.reduce((a, b) => a + b, 0) / period;

  const pdi = (avgPlusDM / avgTR) * 100;
  const mdi = (avgMinusDM / avgTR) * 100;
  const dx = (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;

  return dx; // Return ADX value
};

export const calculateRSI = (candles, index, period) => {
  if (index < period) return null; // Not enough data

  let gains = 0,
    losses = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses -= change; // Add absolute value of loss
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100; // Avoid division by zero
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

export const calculateMovingAverage = (candles, index, period) => {
  if (index < period) return null; // Not enough data
  const slice = candles.slice(index - period, index);
  const total = slice.reduce((sum, candle) => sum + candle.close, 0);
  return total / period;
};

export const calculateAverageVolume = (candles, index, period) => {
  if (index < period) return null; // Not enough data
  const slice = candles.slice(index - period, index);
  const total = slice.reduce((sum, candle) => sum + candle.volume, 0);
  return total / period;
};

export const multibagger = (candles1) => {
  const results = [];

  const rsiCalculator = rsi()
    .options({ windowSize: 14 })
    .merge((d, c) => {
      d.rsi = c;
    });

  const candles = rsiCalculator(candles1);

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    // Criteria 1: Sustained Uptrend (higher highs and higher lows)
    const isUptrend = current.high > prev.high && current.low > prev.low;

    // Criteria 2: Moving Average Crossover
    const shortTermAvg = calculateMovingAverage(candles, i, 50); // 50-day MA
    const longTermAvg = calculateMovingAverage(candles, i, 200); // 200-day MA
    const isMovingAverageBullish = shortTermAvg > longTermAvg;

    // Criteria 3: Volume Spike
    const avgVolume = calculateAverageVolume(candles, i, 20); // 20-day avg volume
    const isVolumeSpike = current.volume > avgVolume * 1.5;

    // Criteria 4: RSI Confirmation
    // const rsi = calculateRSI(candles, i, 14); // 14-period RSI
    // console.log(rsi, current.rsi);
    const isRSIBullish = current.rsi >= 50 && rsi <= 70;

    // Criteria 5: ADX Confirmation
    const adx = calculateADX(candles, i, 14); // 14-period ADX
    const isADXStrongTrend = adx > 25;

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
