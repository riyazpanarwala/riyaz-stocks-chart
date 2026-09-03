// Function to calculate the EMA
export const ema = (candles, period = 14, isObj = true) => {
  if (!Array.isArray(candles) || candles.length === 0) {
    return [];
  }

  const k = 2 / (period + 1);

  let prices = candles;
  if (isObj) {
    prices = candles.map((v) => v?.close ?? 0);
  }

  if (prices.length === 0 || prices[0] == null) {
    return [];
  }

  let emaArray = [prices[0]]; // First EMA value is the first price

  for (let i = 1; i < prices.length; i++) {
    const price = prices[i] ?? emaArray[i - 1];
    const ema = price * k + emaArray[i - 1] * (1 - k);
    emaArray.push(ema);
  }

  return emaArray;
};
