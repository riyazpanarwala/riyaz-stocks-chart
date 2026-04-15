// cssVar.js - Dynamic theme color helper
export const getCssVar = (name, fallback) => {
  if (typeof window === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return val || fallback;
};

/**
 * Returns fresh color values from current CSS variables
 * Call this whenever you need colors (e.g., on theme switch)
 */
export const getThemeColors = () => ({
  // Canvas/structural
  bg: getCssVar("--bg", "#0c0e14"),
  gridLine: getCssVar("--chart-grid-line", "rgba(255,255,255,0.06)"),
  axis: getCssVar("--chart-axis", "rgba(255,255,255,0.22)"),
  axisLabel: getCssVar("--chart-axis-label", "#6a7290"),
  crosshair: getCssVar("--chart-crosshair", "rgba(0,207,247,0.55)"),
  edgeFill: getCssVar("--chart-edge-fill", "#1f2436"),
  edgeStroke: getCssVar("--accent", "#00cff7"),
  edgeText: getCssVar("--tx-primary", "#d8dce8"),

  // Candle/bar
  bull: getCssVar("--bull", "#1ec99a"),
  bear: getCssVar("--bear", "#f0506a"),
  volBull: getCssVar("--chart-vol-bull", "rgba(30,201,154,0.30)"),
  volBear: getCssVar("--chart-vol-bear", "rgba(240,80,106,0.30)"),

  // Mouse/coordinate
  mouseCoord: getCssVar("--surface-3", "#1f2436"),
  mouseText: getCssVar("--tx-primary", "#d8dce8"),

  // Text
  ohlcText: getCssVar("--tx-second", "#7a82a0"),
  tx_primary: getCssVar("--tx-primary", "#d8dce8"),

  // Indicators
  indicator: getCssVar("--chart-indicator", "#00cff7"),

  // MACD
  macdLine: getCssVar("--chart-macd-line", "#f0506a"),
  macdSignal: getCssVar("--chart-macd-signal", "#1ec99a"),
  macdHist: getCssVar("--chart-macd-hist", "#4a90d9"),
  macdEdgeFill: getCssVar("--surface-3", "#1f2436"),
  macdEdgeStroke: getCssVar("--accent", "#00cff7"),
  macdEdgeText: getCssVar("--tx-primary", "#d8dce8"),

  // MA crossover
  longArrow: getCssVar("--bull", "#1ec99a"),
  shortArrow: getCssVar("--bear", "#f0506a"),

  // DMI
  dmiAdx: getCssVar("--chart-dmi-adx", "#f0506a"),
  dmiPlusDI: getCssVar("--chart-dmi-plus", "#00cff7"),
  dmiMinusDI: getCssVar("--chart-dmi-minus", "#f5a623"),

  // Bollinger
  bbTop: getCssVar("--chart-bb-top", "#f5a623"),
  bbMiddle: getCssVar("--chart-bb-mid", "#d8dce8"),
  bbBottom: getCssVar("--chart-bb-bottom", "#f5a623"),
  bbFill: getCssVar("--chart-bb-fill", "rgba(0,207,247,0.08)"),

  // RSI
  rsiLine: getCssVar("--chart-rsi-line", "#d8dce8"),
  rsiBand: getCssVar("--chart-rsi-band", "rgba(255,255,255,0.15)"),
  rsiOversold: getCssVar("--chart-rsi-oversold", "#1ec99a"),
  rsiOverbought: getCssVar("--chart-rsi-overbought", "#f0506a"),

  // Annotations
  annotBull: getCssVar("--bull", "#1ec99a"),
  annotBear: getCssVar("--bear", "#f0506a"),
  annotVolume: getCssVar("--accent", "#00cff7"),
  annotDefault: "#a78bfa",

  // Position lines
  posTarget: getCssVar("--chart-pos-target", "rgba(30,201,154,1)"),
  posTargetBg: getCssVar("--chart-pos-target-bg", "rgba(30,201,154,0.30)"),
  posStop: getCssVar("--chart-pos-stop", "rgba(240,80,106,1)"),
  posStopBg: getCssVar("--chart-pos-stop-bg", "rgba(240,80,106,0.30)"),
  posEntry: getCssVar("--chart-pos-entry", "rgba(180,180,180,1)"),
  posGain: "rgba(30,201,154,0.18)",
  posLoss: "rgba(240,80,106,0.18)",
  posTextGain: getCssVar("--bull", "#1ec99a"),
  posTextLoss: getCssVar("--bear", "#f0506a"),
  posEdgeFill: getCssVar("--surface-3", "#2a2e40"),
  posEdgeStroke: getCssVar("--tx-second", "#6a7290"),

  // Angle overlay
  angleStroke: getCssVar("--accent", "rgba(0,207,247,0.70)"),
  angleText: getCssVar("--tx-primary", "#d8dce8"),

  surface3: getCssVar("--surface-3", "#1f2436"),
  accentSoft: getCssVar("--accent-soft", "rgba(56,189,248,0.12)"),
});

// Default export for backward compatibility (calls function once)
// export default getThemeColors();