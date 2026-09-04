export function classifyMarketRegime({ close, ema20, ema50, ema200, adx, plusDI, minusDI }, adxStrong = 25) {
  if ([close, ema20, ema50, ema200, adx, plusDI, minusDI].some((v) => v == null)) return "UNKNOWN";
  const bullStack = close > ema20 && ema20 > ema50 && ema50 > ema200;
  const bearStack = close < ema20 && ema20 < ema50 && ema50 < ema200;
  if (bullStack && adx >= adxStrong && plusDI > minusDI) return "STRONG_UPTREND";
  if (bearStack && adx >= adxStrong && minusDI > plusDI) return "STRONG_DOWNTREND";
  if (close > ema50 && ema20 > ema50 && plusDI >= minusDI) return "UPTREND";
  if (close < ema50 && ema20 < ema50 && minusDI >= plusDI) return "DOWNTREND";
  return "SIDEWAYS";
}
