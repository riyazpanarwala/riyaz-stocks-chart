export const DEFAULT_STRATEGY_CONFIG = Object.freeze({
  periods: { emaFast: 20, emaMedium: 50, emaSlow: 200, rsi: 14, atr: 14, adx: 14, volume: 20 },
  priceAction: { breakoutLookback: 20, swingLeft: 2, swingRight: 2, volumeConfirmationRatio: 1.5 },
  thresholds: { adxStrong: 25, adxMin: 20, rsiBullMin: 52, rsiBullMax: 70, rsiOverbought: 70, rsiBear: 45, buyScore: 60, exitScore: 60, dominance: 15, volumeMin: 0.75 },
  risk: { atrMultiplier: 1.5, target1R: 2, target2R: 3, breakevenAtTarget1: false }
});

/**
 * Merges user-provided strategy config overrides with DEFAULT_STRATEGY_CONFIG.
 * @param {Object} [overrides={}] Strategy configuration overrides
 * @returns {Object} Merged strategy configuration object
 */
export function mergeStrategyConfig(overrides = {}) {
  return {
    periods: { ...DEFAULT_STRATEGY_CONFIG.periods, ...overrides.periods },
    priceAction: { ...DEFAULT_STRATEGY_CONFIG.priceAction, ...overrides.priceAction },
    thresholds: { ...DEFAULT_STRATEGY_CONFIG.thresholds, ...overrides.thresholds },
    risk: { ...DEFAULT_STRATEGY_CONFIG.risk, ...overrides.risk }
  };
}
