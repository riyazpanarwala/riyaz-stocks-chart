export function sma(values, period) {
  const result = Array(values.length).fill(null);
  if (values.length < period) return result;

  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];

    if (i >= period) sum -= values[i - period];

    if (i >= period - 1) result[i] = sum / period;
  }

  return result;
}

export function volumeRatio(volumes, period = 20) {
  return volumes.map((volume, i) => {
    if (i < period) return null;
    let sum = 0;
    for (let j = i - period; j < i; j++) sum += volumes[j];
    const previousAverage = sum / period;
    return previousAverage === 0 ? null : volume / previousAverage;
  });
}
