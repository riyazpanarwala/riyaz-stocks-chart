import { stochasticOscillator } from "@riyazpanarwala/indicators";
const Stochastic = require("technicalindicators").Stochastic;

export const sto1 = (dataArr, period = 14, signalPeriod = 3) => {
  const input = {
    close: dataArr.map((v) => v.close),
    high: dataArr.map((v) => v.high),
    low: dataArr.map((v) => v.low),
    period: period,
    signalPeriod: signalPeriod,
  };

  return Stochastic.calculate(input);
};

export const sto = (initialData) => {
  const slowSTO = stochasticOscillator()
    .options({ windowSize: 20, kWindowSize: 3 })
    .merge((d, c) => {
      d.slowSTO = c;
    })
    .accessor((d) => d.slowSTO);
  const fastSTO = stochasticOscillator()
    .options({ windowSize: 14, kWindowSize: 1 })
    .merge((d, c) => {
      d.fastSTO = c;
    })
    .accessor((d) => d.fastSTO);
  const fullSTO = stochasticOscillator()
    .options({ windowSize: 20, kWindowSize: 20, dWindowSize: 3 })
    .merge((d, c) => {
      d.fullSTO = c;
    })
    .accessor((d) => d.fullSTO);

  const calculatedData = slowSTO(fastSTO(fullSTO(initialData)));

  return calculatedData;
};

// Function to calculate the Stochastic Oscillator
export const calculateStochastic = (initialData, period = 20, smooth = 3) => {
  const highs = initialData.map((v) => v.high);
  const lows = initialData.map((v) => v.low);
  const closes = initialData.map((v) => v.close);

  if (closes.length < period || highs.length < period || lows.length < period) {
    console.error(
      "Not enough data points to calculate the Stochastic Oscillator"
    );
  }

  let fastKValues = [];
  let slowKValues = [];
  let slowDValues = [];

  for (let i = period - 1; i < closes.length; i++) {
    // Extract the last 'period' closes, highs, and lows
    let currentHighs = highs.slice(i - period + 1, i + 1);
    let currentLows = lows.slice(i - period + 1, i + 1);

    // Calculate the highest high and lowest low in the period
    let highestHigh = Math.max(...currentHighs);
    let lowestLow = Math.min(...currentLows);

    // Calculate Fast %K
    let fastK = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    fastKValues.push(fastK);

    // Calculate Slow %K (3-period SMA of Fast %K)
    if (fastKValues.length >= smooth) {
      let slowK =
        fastKValues.slice(-smooth).reduce((a, b) => a + b, 0) / smooth;
      slowKValues.push(slowK);

      // Calculate Slow %D (3-period SMA of Slow %K)
      if (slowKValues.length >= smooth) {
        let slowD =
          slowKValues.slice(-smooth).reduce((a, b) => a + b, 0) / smooth;
        slowDValues.push(slowD);
      }
    }
  }

  return { fastKValues, slowKValues, slowDValues };
};
