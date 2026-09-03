export function calculateAtrRisk(entry, atr, { atrMultiplier = 1.5, target1R = 2, target2R = 3 } = {}) {
  if (![entry, atr].every(Number.isFinite) || entry <= 0 || atr <= 0) return { entry, stopLoss: null, target1: null, target2: null, riskPerShare: null, rewardRisk1: target1R, rewardRisk2: target2R };
  const riskPerShare = atr * atrMultiplier;
  return { entry, stopLoss: entry - riskPerShare, target1: entry + riskPerShare * target1R, target2: entry + riskPerShare * target2R, riskPerShare, rewardRisk1: target1R, rewardRisk2: target2R };
}
