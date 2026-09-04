export const roc = (prices, period = 21) => {
  if (!Array.isArray(prices) || prices.length === 0) {
    return [];
  }

  // Ensure we have enough data points
  if (prices.length < period) {
    return Array(prices.length).fill(undefined);
  }

  let roc = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      roc.push(undefined);
    } else {
      const currentPrice = prices[i]?.close ?? 0;
      const previousPrice = prices[i - period]?.close ?? 0;
      const rocValue = previousPrice
        ? ((currentPrice - previousPrice) / previousPrice) * 100
        : 0;
      roc.push(rocValue);
    }
  }

  return roc;
};
