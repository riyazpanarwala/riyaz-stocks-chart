export const sma = (data, period = 50, source = "close") => {
  // Ensure we have enough data points
  if (data.length < period) {
    return [];
  }

  let sma = [];

  for (let i = 0; i <= data.length - period; i++) {
    // Calculate the sum of the closing prices for the current window
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i + j][source];
    }
    // Calculate the average and add it to the SMA array
    sma.push(sum / period);
  }

  let nullValues = [];
  for (let i = 0; i < period; i++) {
    nullValues.push(undefined);
  }

  return [...nullValues, ...sma];
};
