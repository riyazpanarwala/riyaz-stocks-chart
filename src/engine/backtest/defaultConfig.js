export const DEFAULT_BACKTEST_CONFIG = Object.freeze({
  initialCapital: 100_000,
  quantity: 1,
  slippageBps: 0,
  forceCloseAtEnd: true,
  annualizationFactor: 252,
  sameBarExitPriority: "STOP_FIRST",
  costs: {
    brokerageRate: 0,
    brokerageMaxPerOrder: 0,
    sttBuyRate: 0,
    sttSellRate: 0,
    exchangeRate: 0,
    sebiRate: 0,
    gstRate: 0,
    stampDutyBuyRate: 0,
    fixedPerOrder: 0
  }
});

export function mergeBacktestConfig(overrides = {}) {
  const merged = { ...DEFAULT_BACKTEST_CONFIG, ...overrides, costs: { ...DEFAULT_BACKTEST_CONFIG.costs, ...overrides.costs } };
  if (!(merged.initialCapital > 0)) throw new Error("initialCapital must be positive");
  if (!Number.isInteger(merged.quantity) || merged.quantity <= 0) throw new Error("quantity must be a positive integer");
  if (merged.slippageBps < 0) throw new Error("slippageBps cannot be negative");
  if (!(merged.annualizationFactor > 0)) throw new Error("annualizationFactor must be positive");
  for (const [name, value] of Object.entries(merged.costs)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`costs.${name} must be a non-negative number`);
  }
  if (!['STOP_FIRST', 'TARGET_FIRST'].includes(merged.sameBarExitPriority)) throw new Error("sameBarExitPriority must be STOP_FIRST or TARGET_FIRST");
  return merged;
}
