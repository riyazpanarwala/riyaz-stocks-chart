/* ── Dark theme palette (matches globals.css) ── */
const DARK = {
  /* ── Canvas / structural ── */
  bg:           "#0c0e14",
  gridLine:     "rgba(255,255,255,0.06)",
  axis:         "rgba(255,255,255,0.22)",
  axisLabel:    "#6a7290",
  crosshair:    "rgba(0,207,247,0.55)",
  edgeFill:     "#1f2436",
  edgeStroke:   "#00cff7",
  edgeText:     "#d8dce8",

  /* ── Candle / bar ── */
  bull:         "#1ec99a",
  bear:         "#f0506a",
  volBull:      "rgba(30,201,154,0.30)",
  volBear:      "rgba(240,80,106,0.30)",

  /* ── Mouse / coordinate ── */
  mouseCoord:   "#1f2436",
  mouseText:    "#d8dce8",

  /* ── Text ── */
  ohlcText:     "#7a82a0",
  tx_primary:   "#d8dce8",

  /* ── Indicators (single accent used across IndicatorChart, SuperTrendChart, OBV) ── */
  indicator:    "#00cff7",

  /* ── MACD series ── */
  macdLine:     "#f0506a",
  macdSignal:   "#1ec99a",
  macdHist:     "#4a90d9",
  macdEdgeFill: "#1f2436",
  macdEdgeStroke:"#00cff7",
  macdEdgeText: "#d8dce8",

  /* ── MA crossover annotations ── */
  longArrow:    "#1ec99a",
  shortArrow:   "#f0506a",

  /* ── DMI ── */
  dmiAdx:       "#f0506a",
  dmiPlusDI:    "#00cff7",
  dmiMinusDI:   "#f5a623",

  /* ── Bollinger Bands ── */
  bbTop:        "#f5a623",
  bbMiddle:     "#d8dce8",
  bbBottom:     "#f5a623",
  bbFill:       "rgba(0,207,247,0.08)",

  /* ── RSI series ── */
  rsiLine:      "#d8dce8",
  rsiBand:      "rgba(255,255,255,0.15)",
  rsiOversold:  "#1ec99a",
  rsiOverbought:"#f0506a",

  /* ── Annotations (breakout / pattern pins) ── */
  annotBull:    "#1ec99a",
  annotBear:    "#f0506a",
  annotVolume:  "#00cff7",
  annotDefault: "#a78bfa",

  /* ── Long / short position lines ── */
  posTarget:    "rgba(30,201,154,1)",
  posTargetBg:  "rgba(30,201,154,0.30)",
  posStop:      "rgba(240,80,106,1)",
  posStopBg:    "rgba(240,80,106,0.30)",
  posEntry:     "rgba(180,180,180,1)",
  posGain:      "rgba(30,201,154,0.18)",
  posLoss:      "rgba(240,80,106,0.18)",
  posTextGain:  "#1ec99a",
  posTextLoss:  "#f0506a",
  posEdgeFill:  "#2a2e40",
  posEdgeStroke:"#6a7290",

  /* ── Angle calculator overlay ── */
  angleStroke:  "rgba(0,207,247,0.70)",
  angleText:    "#d8dce8",
};

export default DARK;
