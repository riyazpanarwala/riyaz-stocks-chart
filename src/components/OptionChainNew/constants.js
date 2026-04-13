// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — single source of truth for all colours/sizes
// ═══════════════════════════════════════════════════════════════
export const C = Object.freeze({
  bg:       "#0d1117",
  surface:  "#161b22",
  border:   "#21262d",
  surface2: "#1c2128",
  green:    "#3fb950",
  red:      "#f85149",
  blue:     "#58a6ff",
  yellow:   "#e3b341",
  purple:   "#c084fc",
  muted:    "#8b949e",
  text:     "#e6edf3",
  greenBg:  "#0d2a16",
  redBg:    "#2a0d0d",
});

// ═══════════════════════════════════════════════════════════════
// BREAKOUT-DETECTOR THRESHOLDS
// ═══════════════════════════════════════════════════════════════
export const THRESHOLDS = Object.freeze({
  OI_DISPLAY_HIGH:                300,
  OI_BUILD_MIN:                   5_000,
  OI_SPIKE_MULTIPLIER:            2,
  OI_BUILD_MULTIPLIER:            1.5,
  AVG_OI_MINIMUM:                 1_000,
  PCR_EXTREME_HIGH:               1.6,
  PCR_EXTREME_LOW:                0.45,
  VELOCITY_MIN_PCT:               1.5,
  VELOCITY_SNAPSHOTS:             3,
  MAX_PAIN_THRESHOLD_MULTIPLIER:  3,
  CONCENTRATION_MIN_PCT:          45,
  CONCENTRATION_DISTANCE_MULTIPLIER: 2,
  UNWIND_THRESHOLD_MULTIPLIER:    0.5,
  MAX_SNAPSHOTS:                  10,
});

// ═══════════════════════════════════════════════════════════════
// AUTO-REFRESH INTERVAL
// ═══════════════════════════════════════════════════════════════
export const REFRESH_MS = 120_000;

// ═══════════════════════════════════════════════════════════════
// SCALP-MODE DISPLAY RANGES  (points either side of ATM)
// ═══════════════════════════════════════════════════════════════
export const SCALP_RANGE  = Object.freeze({ index: 200,  stock: 100 });
export const NORMAL_RANGE = Object.freeze({ index: 1500, stock: 600 });

// ═══════════════════════════════════════════════════════════════
// EMPTY DATA SENTINELS
// ═══════════════════════════════════════════════════════════════
export const EMPTY_INDEX_DATA = Object.freeze({
  timestamp: "", underlyingValue: 0, displayData: [], fullOI: [],
});

export const EMPTY_STOCK_DATA = Object.freeze({
  timestamp: "", underlying: "", underlyingValue: 0, expiries: [], data: [],
});

export const EMPTY_OPTION_LEG = Object.freeze({
  openInterest: 0, changeinOpenInterest: 0,
  totalTradedVolume: 0, lastPrice: 0, change: 0,
});
