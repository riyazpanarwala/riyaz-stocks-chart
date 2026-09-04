export function ema(values, period) {
  if (values.length < period) {
    return Array(values.length).fill(null);
  }

  const result = Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];

  let previous = sum / period;
  result[period - 1] = previous;

  for (let i = period; i < values.length; i++) {
    previous = (values[i] - previous) * multiplier + previous;
    result[i] = previous;
  }

  return result;
}
