export const sma = (data, period = 50, source = "close") => {
  if (!Array.isArray(data)) return [];
  if (data.length < period) {
    return Array(data.length).fill(undefined);
  }

  const result = Array(data.length).fill(undefined);
  let sum = 0;

  for (let i = 0; i < period; i++) {
    const val = source === "" ? data[i] : data[i]?.[source];
    sum += typeof val === "number" ? val : 0;
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    const addVal = source === "" ? data[i] : data[i]?.[source];
    const subVal = source === "" ? data[i - period] : data[i - period]?.[source];
    sum += (typeof addVal === "number" ? addVal : 0) - (typeof subVal === "number" ? subVal : 0);
    result[i] = sum / period;
  }

  return result;
};
