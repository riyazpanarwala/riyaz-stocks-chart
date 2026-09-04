export function calculateTrendStrength(adxValue) {
  let score = 0;
  const reasons = [];

  if (adxValue > 25) {
    score += 10;
    reasons.push("ADX confirms strong trend");
  }

  return { score, maxScore: 10, reasons };
}
