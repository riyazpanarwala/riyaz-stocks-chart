/**
 * Calculates Simple Moving Average (SMA) over a given period.
 * Requires all values in the period window to be finite numbers, otherwise produces undefined.
 * @param {Array} data Array of candle objects or raw numbers
 * @param {number} [period=50] SMA lookback window size
 * @param {string} [source="close"] Candle property key to extract, or empty string for raw numbers
 * @returns {Array<number|undefined>} Array of SMA values aligned with input data
 */
export const sma = (data, period = 50, source = "close") => {
  if (!Array.isArray(data)) return [];
  if (data.length < period || period <= 0) {
    return Array(data.length).fill(undefined);
  }

  const result = Array(data.length).fill(undefined);
  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < period; i++) {
    const raw = source === "" ? data[i] : data[i]?.[source];
    const val = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    if (val !== null) {
      sum += val;
      validCount++;
    }
  }
  if (validCount === period) {
    result[period - 1] = sum / period;
  }

  for (let i = period; i < data.length; i++) {
    const rawAdd = source === "" ? data[i] : data[i]?.[source];
    const addVal = typeof rawAdd === "number" && Number.isFinite(rawAdd) ? rawAdd : null;

    const rawSub = source === "" ? data[i - period] : data[i - period]?.[source];
    const subVal = typeof rawSub === "number" && Number.isFinite(rawSub) ? rawSub : null;

    if (addVal !== null) {
      sum += addVal;
      validCount++;
    }
    if (subVal !== null) {
      sum -= subVal;
      validCount--;
    }

    if (validCount === period) {
      result[i] = sum / period;
    } else {
      result[i] = undefined;
    }
  }

  return result;
};
