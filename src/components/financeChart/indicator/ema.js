// Function to calculate the EMA
export const ema = (candles, period = 14, isObj = true) => {
  const k = 2 / (period + 1);

  let prices = candles;
  if (isObj) {
    prices = candles.map((v) => v.close);
  }

  let emaArray = [prices[0]]; // First EMA value is the first price

  for (let i = 1; i < prices.length; i++) {
    const ema = prices[i] * k + emaArray[i - 1] * (1 - k);
    emaArray.push(ema);
  }

  return emaArray;
};
