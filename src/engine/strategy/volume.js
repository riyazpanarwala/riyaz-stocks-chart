export function calculateVolume({ volumeRatio, breakout }) {
  let score = 0;
  const reasons = [];

  if (volumeRatio > 1.5) {
    score += 10;
    reasons.push("Volume > 1.5x average");
  } else if (volumeRatio > 1.2) {
    score += 5;
    reasons.push("Volume > 1.2x average");
  }

  if (breakout && volumeRatio > 1.5) {
    score += 5;
    reasons.push("Breakout confirmed by volume");
  }

  return { score, maxScore: 15, reasons };
}
