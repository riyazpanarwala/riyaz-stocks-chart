import { ema } from "../indicators/ema.js";
import { rsi } from "../indicators/rsi.js";
import { macd } from "../indicators/macd.js";
import { atr } from "../indicators/atr.js";
import { adx } from "../indicators/adx.js";
import { volumeRatio } from "../indicators/volume.js";
import { validateCandles } from "../data/candleValidator.js";
import { calculateAtrRisk } from "../risk/atrRisk.js";
import { mergeStrategyConfig } from "./defaultConfig.js";
import { classifyMarketRegime } from "./marketRegime.js";
import { detectBreakout, detectBreakdown, marketStructure } from "./priceAction.js";

const round = (value) => value == null ? null : Number(value.toFixed(4));
const unique = (items) => [...new Set(items)];
function component(name, bullish, bearish, bullishReasons = [], bearishReasons = []) {
  return { name, bullish, bearish, bullishReasons, bearishReasons };
}

function scoreEvidence({ current, values, structure, breakout, breakdown, regime, config }) {
  const i = values.ema20.length - 1, c = config.thresholds, pa = config.priceAction;
  const components = [];
  let bull = 0, bear = 0;
  const add = (item) => { components.push(item); bull += item.bullish; bear += item.bearish; };

  const bullTrend = (current.close > values.ema20[i] ? 7 : 0) + (values.ema20[i] > values.ema50[i] ? 8 : 0) + (values.ema50[i] > values.ema200[i] ? 10 : 0);
  const bearTrend = (current.close < values.ema20[i] ? 7 : 0) + (values.ema20[i] < values.ema50[i] ? 8 : 0) + (values.ema50[i] < values.ema200[i] ? 10 : 0);
  const bullishTrendReasons = [];
  const bearishTrendReasons = [];
  if (current.close > values.ema20[i]) bullishTrendReasons.push("Price above EMA20");
  if (values.ema20[i] > values.ema50[i]) bullishTrendReasons.push("EMA20 above EMA50");
  if (values.ema50[i] > values.ema200[i]) bullishTrendReasons.push("EMA50 above EMA200");
  if (current.close < values.ema20[i]) bearishTrendReasons.push("Price below EMA20");
  if (values.ema20[i] < values.ema50[i]) bearishTrendReasons.push("EMA20 below EMA50");
  if (values.ema50[i] < values.ema200[i]) bearishTrendReasons.push("EMA50 below EMA200");
  add(component("trend", bullTrend, bearTrend, bullishTrendReasons, bearishTrendReasons));

  const macdBull = values.macd.macdLine[i] > values.macd.signalLine[i];
  const macdBear = values.macd.macdLine[i] < values.macd.signalLine[i];
  const rsiValue = values.rsi[i];
  const bullMomentum = (rsiValue >= c.rsiBullMin && rsiValue <= c.rsiBullMax ? 7 : 0) + (macdBull ? 8 : 0);
  const bearMomentum = (rsiValue < c.rsiBear ? 7 : 0) + (macdBear ? 8 : 0);
  const bullishMomentumReasons = [];
  const bearishMomentumReasons = [];
  if (rsiValue >= c.rsiBullMin && rsiValue <= c.rsiBullMax) bullishMomentumReasons.push("RSI in bullish momentum zone");
  if (macdBull) bullishMomentumReasons.push("MACD above signal line");
  if (rsiValue < c.rsiBear) bearishMomentumReasons.push("RSI below bearish threshold");
  if (macdBear) bearishMomentumReasons.push("MACD below signal line");
  add(component("momentum", bullMomentum, bearMomentum, bullishMomentumReasons, bearishMomentumReasons));

  const directionalBull = values.adx.plusDI[i] > values.adx.minusDI[i];
  const directionalBear = values.adx.minusDI[i] > values.adx.plusDI[i];
  const strong = values.adx.adx[i] >= c.adxStrong;
  add(component("trendStrength", strong && directionalBull ? 10 : 0, strong && directionalBear ? 10 : 0, strong && directionalBull ? ["ADX and +DI confirm bullish trend"] : [], strong && directionalBear ? ["ADX and -DI confirm bearish trend"] : []));

  const volumeConfirmed = values.volumeRatio[i] >= pa.volumeConfirmationRatio;
  add(component("breakout", breakout ? 15 + (volumeConfirmed ? 5 : 0) : 0, breakdown ? 15 + (volumeConfirmed ? 5 : 0) : 0, breakout ? [volumeConfirmed ? "Breakout with prior-volume confirmation" : "Breakout"] : [], breakdown ? [volumeConfirmed ? "Breakdown with prior-volume confirmation" : "Breakdown"] : []));
  add(component("priceAction", structure.state === "BULLISH" ? 10 : 0, structure.state === "BEARISH" ? 10 : 0, structure.state === "BULLISH" ? ["Confirmed higher-high/higher-low structure"] : [], structure.state === "BEARISH" ? ["Confirmed lower-high/lower-low structure"] : []));

  if (regime === "STRONG_UPTREND") bull += 20;
  else if (regime === "UPTREND") bull += 10;
  else if (regime === "STRONG_DOWNTREND") bear += 20;
  else if (regime === "DOWNTREND") bear += 10;
  components.push(component(
    "regime",
    regime === "STRONG_UPTREND" ? 20 : regime === "UPTREND" ? 10 : 0,
    regime === "STRONG_DOWNTREND" ? 20 : regime === "DOWNTREND" ? 10 : 0,
    regime === "STRONG_UPTREND" ? ["Strong uptrend regime"] : regime === "UPTREND" ? ["Uptrend regime"] : [],
    regime === "STRONG_DOWNTREND" ? ["Strong downtrend regime"] : regime === "DOWNTREND" ? ["Downtrend regime"] : []
  ));
  return { bullishScore: Math.min(100, bull), bearishScore: Math.min(100, bear), components };
}

function insufficient(candle, index, minimum) {
  const decisionChecks = [`Requires at least ${minimum} candles through this index`];
  return { timestamp: candle.timestamp, index, signal: "NO_TRADE", action: "WAIT", price: candle.close, status: "INSUFFICIENT_DATA", bullishScore: null, bearishScore: null, signalStrength: null, marketRegime: "UNKNOWN", indicators: {}, risk: {}, components: [], evidence: { bullish: [], bearish: [], decisionChecks }, reasons: decisionChecks };
}

function generateLatest(candles, options = {}) {
  const config = mergeStrategyConfig(options.config), p = config.periods;
  validateCandles(candles);
  const minimum = Math.max(p.emaSlow, config.priceAction.breakoutLookback + 1, p.adx * 2);
  const i = candles.length - 1, current = candles[i];
  if (candles.length < minimum) return insufficient(current, i, minimum);
  const closes = candles.map((c) => c.close), volumes = candles.map((c) => c.volume);
  const values = {
    ema20: ema(closes, p.emaFast), ema50: ema(closes, p.emaMedium), ema200: ema(closes, p.emaSlow),
    rsi: rsi(closes, p.rsi), macd: macd(closes), atr: atr(candles, p.atr), adx: adx(candles, p.adx), volumeRatio: volumeRatio(volumes, p.volume)
  };
  const indicators = { close: current.close, ema20: values.ema20[i], ema50: values.ema50[i], ema200: values.ema200[i], adx: values.adx.adx[i], plusDI: values.adx.plusDI[i], minusDI: values.adx.minusDI[i] };
  const regime = classifyMarketRegime(indicators, config.thresholds.adxStrong);
  const breakout = detectBreakout(candles, i, config.priceAction.breakoutLookback);
  const breakdown = detectBreakdown(candles, i, config.priceAction.breakoutLookback);
  const structure = marketStructure(candles, i, config.priceAction.swingLeft, config.priceAction.swingRight);
  const scores = scoreEvidence({ current, values, structure, breakout, breakdown, regime, config });
  const { buyScore, exitScore, dominance } = config.thresholds;
  const buy = regime !== "STRONG_DOWNTREND" && regime !== "SIDEWAYS" && scores.bullishScore >= buyScore && scores.bullishScore - scores.bearishScore >= dominance;
  const bearishExitSetup = scores.bearishScore >= exitScore && scores.bearishScore - scores.bullishScore >= dominance;
  const positionState = options.positionState ?? "FLAT";
  const signal = buy ? "BUY" : positionState === "LONG" && bearishExitSetup ? "EXIT" : positionState === "LONG" ? "HOLD" : "NO_TRADE";
  const action = signal === "BUY" ? "ENTER_LONG" : signal === "EXIT" ? "EXIT_LONG" : signal === "HOLD" ? "HOLD_LONG" : bearishExitSetup ? "AVOID" : "WAIT";
  const bullishEvidence = unique(scores.components.flatMap((item) => item.bullishReasons));
  const bearishEvidence = unique(scores.components.flatMap((item) => item.bearishReasons));
  const decisionChecks = [];
  if (regime === "STRONG_DOWNTREND" && signal !== "EXIT") decisionChecks.push("BUY blocked by strong downtrend regime");
  if (regime === "SIDEWAYS" && signal !== "EXIT") decisionChecks.push("BUY blocked by sideways regime");
  if (!buy && scores.bullishScore < buyScore) decisionChecks.push(`Bullish score ${scores.bullishScore} is below BUY threshold ${buyScore}`);
  if (!buy && scores.bullishScore >= buyScore && scores.bullishScore - scores.bearishScore < dominance) decisionChecks.push(`Bullish lead ${scores.bullishScore - scores.bearishScore} is below dominance threshold ${dominance}`);
  if (positionState === "LONG" && !bearishExitSetup && scores.bearishScore < exitScore) decisionChecks.push(`Bearish score ${scores.bearishScore} is below EXIT threshold ${exitScore}`);
  if (positionState === "LONG" && !bearishExitSetup && scores.bearishScore >= exitScore && scores.bearishScore - scores.bullishScore < dominance) decisionChecks.push(`Bearish lead ${scores.bearishScore - scores.bullishScore} is below dominance threshold ${dominance}`);
  const primaryEvidence = signal === "EXIT"
    ? bearishEvidence
    : signal === "BUY"
      ? bullishEvidence
      : scores.bearishScore > scores.bullishScore ? bearishEvidence : bullishEvidence;
  const reasons = unique([...primaryEvidence, ...decisionChecks]);
  const risk = signal === "BUY"
    ? calculateAtrRisk(current.close, values.atr[i], config.risk)
    : { entry: null, stopLoss: null, target1: null, target2: null, riskPerShare: null, rewardRisk1: null, rewardRisk2: null };
  return {
    timestamp: current.timestamp, index: options.originalIndex ?? i, signal, action, price: current.close,
    status: "READY", bullishScore: scores.bullishScore, bearishScore: scores.bearishScore,
    signalStrength: Math.abs(scores.bullishScore - scores.bearishScore), marketRegime: regime,
    indicators: { ema20: round(values.ema20[i]), ema50: round(values.ema50[i]), ema200: round(values.ema200[i]), rsi: round(values.rsi[i]), macd: round(values.macd.macdLine[i]), macdSignal: round(values.macd.signalLine[i]), macdHistogram: round(values.macd.histogram[i]), atr: round(values.atr[i]), adx: round(values.adx.adx[i]), plusDI: round(values.adx.plusDI[i]), minusDI: round(values.adx.minusDI[i]), volumeRatio: round(values.volumeRatio[i]) },
    risk: Object.fromEntries(Object.entries(risk).map(([key, value]) => [key, typeof value === "number" ? round(value) : value])),
    priceAction: { breakout, breakdown, structure }, components: scores.components,
    evidence: { bullish: bullishEvidence, bearish: bearishEvidence, decisionChecks }, reasons
  };
}

export function generateSignalAtIndex(candles, index, options = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= candles.length) throw new RangeError("index is outside candle range");
  return generateLatest(candles.slice(0, index + 1), { ...options, originalIndex: index });
}

export function generateSignals(candles, options = {}) {
  return candles.map((_, index) => generateSignalAtIndex(candles, index, options));
}

export function generateSignal(candles, options = {}) {
  return generateSignalAtIndex(candles, candles.length - 1, options);
}
