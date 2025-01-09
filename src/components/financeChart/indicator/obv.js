// Function to calculate OBV
export const obv = (data) => {
  let obv = 0;
  return data.map((d, i) => {
    if (i === 0) {
      return { ...d, obv };
    }
    const prevClose = data[i - 1].close;
    if (d.close > prevClose) {
      obv += d.volume;
    } else if (d.close < prevClose) {
      obv -= d.volume;
    }
    return { ...d, obv };
  });
};
