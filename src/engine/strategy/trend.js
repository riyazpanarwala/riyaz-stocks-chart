export function calculateTrend({ close, ema20, ema50, ema200 }) {
  let score = 0;
  const reasons = [];

  if (close > ema20) {
    score += 5;
    reasons.push("Price above EMA20");
  }

  if (ema20 > ema50) {
    score += 10;
    reasons.push("EMA20 above EMA50");
  }

  if (ema50 > ema200) {
    score += 10;
    reasons.push("EMA50 above EMA200");
  }

  return { score, maxScore: 25, reasons };
}
