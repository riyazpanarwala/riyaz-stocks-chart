export const crossover = (sma1, sma2) => {
  if (!Array.isArray(sma1) || !Array.isArray(sma2) || !sma1.length || !sma2.length) {
    return [{ type: "Neutral" }];
  }

  const len = Math.min(sma1.length, sma2.length);
  const result = [];

  for (let i = 0; i < len; i++) {
    const curr1 = sma1[i];
    const curr2 = sma2[i];

    if (curr1 == null || curr2 == null || isNaN(curr1) || isNaN(curr2)) {
      result.push({ type: "Neutral" });
      continue;
    }

    if (i === 0) {
      result.push({ type: curr1 > curr2 ? "Bullish" : curr1 < curr2 ? "Bearish" : "Neutral" });
      continue;
    }

    const prev1 = sma1[i - 1];
    const prev2 = sma2[i - 1];

    if (prev1 != null && prev2 != null && !isNaN(prev1) && !isNaN(prev2)) {
      if (prev1 <= prev2 && curr1 > curr2) {
        result.push({ type: "Bullish (Cross)", isCross: true });
        continue;
      }
      if (prev1 >= prev2 && curr1 < curr2) {
        result.push({ type: "Bearish (Cross)", isCross: true });
        continue;
      }
    }

    result.push({ type: curr1 > curr2 ? "Bullish" : curr1 < curr2 ? "Bearish" : "Neutral" });
  }

  return result.length ? result : [{ type: "Neutral" }];
};
