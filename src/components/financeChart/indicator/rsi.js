export const rsi = (data, period = 14) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Ensure we have enough data points
  if (data.length < period) {
    return Array(data.length).fill(null);
  }

  let gains = [];
  let losses = [];

  // Calculate the initial gains and losses
  for (let i = 1; i < period; i++) {
    let change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains.push(change);
    } else {
      losses.push(Math.abs(change));
    }
  }

  // Calculate the average gain and loss
  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  // Calculate the RSI for each subsequent data point
  let rsi = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(null);
    } else {
      let change = data[i].close - data[i - 1].close;
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }

      let currentRSI;
      if (avgLoss === 0) {
        currentRSI = avgGain === 0 ? 50 : 100;
      } else {
        let rs = avgGain / avgLoss;
        currentRSI = 100 - 100 / (1 + rs);
      }
      rsi.push(currentRSI);
    }
  }

  return rsi;
};
