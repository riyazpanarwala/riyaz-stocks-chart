// Function to calculate OBV
export const obv = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  let obv = 0;
  return data.map((d, i) => {
    const vol = typeof d.volume === "number" ? d.volume : 0;
    if (i === 0) {
      return { ...d, obv };
    }
    const prevClose = data[i - 1]?.close ?? d.close;
    if (d.close > prevClose) {
      obv += vol;
    } else if (d.close < prevClose) {
      obv -= vol;
    }
    return { ...d, obv };
  });
};
