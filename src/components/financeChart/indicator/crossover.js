export const crossover = (sma1, sma2) => {
  let crossoverPoints = [];

  for (let i = 1; i < sma1.length && i < sma2.length; i++) {
    let prev5 = sma1[i - 1];
    let prev20 = sma2[i - 1];
    let curr5 = sma1[i];
    let curr20 = sma2[i];

    if (prev5 < prev20 && curr5 > curr20) {
      crossoverPoints.push({ type: "Bullish" });
    } else if (prev5 > prev20 && curr5 < curr20) {
      crossoverPoints.push({ type: "Bearish" });
    }
  }

  if (!crossoverPoints.length) {
    if (sma1[sma1.length - 1] > sma2[sma2.length - 1]) {
      crossoverPoints.push({ type: "Bullish" });
    } else if (sma1[sma1.length - 1] < sma2[sma2.length - 1]) {
      crossoverPoints.push({ type: "Bearish" });
    } else {
      crossoverPoints.push({ type: "Neutral" });
    }
  }

  return crossoverPoints;
};
