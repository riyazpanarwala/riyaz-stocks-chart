export const roc = (prices, period = 21) => {
  // Ensure we have enough data points
  if (prices.length < period) {
    return [];
  }

  let roc = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      roc.push(undefined);
    } else {
      const currentPrice = prices[i].close;
      const previousPrice = prices[i - period].close;
      const rocValue = ((currentPrice - previousPrice) / previousPrice) * 100;
      roc.push(rocValue);
    }
  }

  return roc;
};
