export const DEFAULT_BACKTEST_CONFIG = Object.freeze({
  initialCapital: 100_000,
  quantity: 1,
  slippageBps: 0,
  forceCloseAtEnd: true,
  annualizationFactor: 252,
  sameBarExitPriority: "STOP_FIRST",
  trailingStop: "NONE",
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

/**
 * Merges user-provided backtest config overrides with DEFAULT_BACKTEST_CONFIG and validates ranges.
 * @param {Object} [overrides={}] Backtest configuration overrides
 * @returns {Object} Validated merged backtest configuration
 */
export function mergeBacktestConfig(overrides = {}) {
  const merged = { ...DEFAULT_BACKTEST_CONFIG, ...overrides, costs: { ...DEFAULT_BACKTEST_CONFIG.costs, ...overrides.costs } };
  if (!Number.isFinite(merged.initialCapital) || merged.initialCapital <= 0) throw new Error("initialCapital must be a positive finite number");
  if (!Number.isInteger(merged.quantity) || merged.quantity <= 0) throw new Error("quantity must be a positive integer");
  if (!Number.isFinite(merged.slippageBps) || merged.slippageBps < 0) throw new Error("slippageBps must be a non-negative finite number");
  if (!Number.isFinite(merged.annualizationFactor) || merged.annualizationFactor <= 0) throw new Error("annualizationFactor must be a positive finite number");
  for (const [name, value] of Object.entries(merged.costs)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`costs.${name} must be a non-negative number`);
  }
  if (!['STOP_FIRST', 'TARGET_FIRST'].includes(merged.sameBarExitPriority)) throw new Error("sameBarExitPriority must be STOP_FIRST or TARGET_FIRST");
  return merged;
}
