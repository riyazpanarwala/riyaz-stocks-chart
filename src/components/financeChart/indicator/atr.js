// Function to calculate the True Range
export const calculateTrueRange = (data) => {
  let trueRange = [];

  for (let i = 1; i < data.length; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    const previousClose = data[i - 1].close;

    const tr = Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - previousClose),
      Math.abs(currentLow - previousClose)
    );

    trueRange.push(tr);
  }

  return trueRange;
};

// Function to calculate the ATR
export const atr = (data, period = 14) => {
  const trueRange = calculateTrueRange(data);

  // Ensure we have enough data points
  if (trueRange.length < period) {
    throw new Error("Not enough data points");
  }

  let atr = [];
  for (let i = 0; i < period; i++) {
    atr.push(undefined);
  }

  let initialATR =
    trueRange.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atr.push(initialATR);

  for (let i = period; i < trueRange.length; i++) {
    const currentATR =
      (atr[atr.length - 1] * (period - 1) + trueRange[i]) / period;
    atr.push(currentATR);
  }

  return atr;
};
