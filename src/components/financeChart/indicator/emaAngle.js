// import { mean } from "d3-array";

const calculateSlope = (point1, point2) =>
  (point2.value - point1.value) / (point2.time - point1.time);

const calculateAngleFromSlopes = (slope1, slope2) => {
  const angleInRadians = Math.atan((slope2 - slope1) / (1 + slope1 * slope2));
  const angleInDegrees = angleInRadians * (180 / Math.PI);
  return angleInDegrees;
};

/*
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  let emaArray = [];
  let ema = mean(data.slice(0, period));

  emaArray[period - 1] = ema;

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    emaArray[i] = ema;
  }
  return emaArray;
};

const emaPeriod1 = 15;
const emaPeriod2 = 45;

const ema1 = calculateEMA(
  data.map((d) => d.close),
  emaPeriod1
);
const ema2 = calculateEMA(
  data.map((d) => d.close),
  emaPeriod2
);
*/

export const emaAngleIndividual = (
  data,
  baseIdx,
  lastIdx,
  emakey1,
  emakey2
) => {
  const slope1 = calculateSlope(
    { time: lastIdx, value: data[lastIdx][emakey1] },
    { time: baseIdx, value: data[baseIdx][emakey1] }
  );
  const slope2 = calculateSlope(
    { time: lastIdx, value: data[lastIdx][emakey2] },
    { time: baseIdx, value: data[baseIdx][emakey2] }
  );
  return calculateAngleFromSlopes(slope1, slope2);
};

export const emaAngle = (data, emakey1, emakey2, emaPeriod1, emaPeriod2) => {
  const slopes = data.map((d, idx) => {
    if (idx >= emaPeriod1 && idx >= emaPeriod2) {
      return emaAngleIndividual(data, idx, idx - 1, emakey1, emakey2);
    }
    return null;
  });
  return slopes;
};
