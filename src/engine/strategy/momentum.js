export function calculateMomentum({
  rsi,
  previousRsi,
  macd,
  macdSignal
}) {
  let score = 0;
  const reasons = [];

  if (
    previousRsi != null &&
    rsi != null &&
    previousRsi <= 50 &&
    rsi > 50
  ) {
    score += 10;
    reasons.push("RSI crossed above 50");
  } else if (rsi >= 55 && rsi <= 70) {
    score += 5;
    reasons.push("RSI in bullish momentum zone");
  }

  if (macd != null && macdSignal != null && macd > macdSignal) {
    score += 5;
    reasons.push("MACD above signal line");
  }

  return { score, maxScore: 20, reasons };
}
