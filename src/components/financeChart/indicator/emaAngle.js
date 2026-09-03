// import { mean } from "d3-array";

const calculateSlope = (point1, point2) => {
  const dt = point2.time - point1.time;
  if (dt === 0) return 0;
  return (point2.value - point1.value) / dt;
};

const calculateAngleFromSlopes = (slope1, slope2) => {
  const denom = 1 + slope1 * slope2;
  if (denom === 0) return 90;
  const angleInRadians = Math.atan((slope2 - slope1) / denom);
  const angleInDegrees = angleInRadians * (180 / Math.PI);
  return angleInDegrees;
};

export const emaAngleIndividual = (
  data,
  baseIdx,
  lastIdx,
  emakey1,
  emakey2
) => {
  if (!Array.isArray(data) || !data[lastIdx] || !data[baseIdx]) return NaN;
  if (lastIdx === baseIdx) return 0;

  const val1_last = data[lastIdx][emakey1];
  const val1_base = data[baseIdx][emakey1];
  const val2_last = data[lastIdx][emakey2];
  const val2_base = data[baseIdx][emakey2];

  if (
    typeof val1_last !== "number" ||
    typeof val1_base !== "number" ||
    typeof val2_last !== "number" ||
    typeof val2_base !== "number"
  ) {
    return NaN;
  }

  const slope1 = calculateSlope(
    { time: lastIdx, value: val1_last },
    { time: baseIdx, value: val1_base }
  );
  const slope2 = calculateSlope(
    { time: lastIdx, value: val2_last },
    { time: baseIdx, value: val2_base }
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
