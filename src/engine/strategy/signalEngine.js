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
  const { buyScore, exitScore, dominance, rsiOverbought, adxMin, volumeMin, min52WeekHighRatio, requireAboveEma200 } = config.thresholds;
  const rsiValue = values.rsi[i];
  const adxValue = values.adx.adx[i];
  const volRatioValue = values.volumeRatio[i];
  const ema200Value = values.ema200[i];

  // 52-week rolling high (up to 252 trading days)
  const lookback52w = Math.min(252, i + 1);
  let high52w = candles[i].high;
  for (let k = Math.max(0, i - lookback52w + 1); k <= i; k++) {
    if (candles[k].high > high52w) high52w = candles[k].high;
  }
  const ratio52w = high52w > 0 ? current.close / high52w : 1;

  const notOverbought = rsiOverbought == null || rsiValue == null || rsiValue <= rsiOverbought;
  const trendStrongEnough = adxMin == null || adxValue == null || adxValue >= adxMin;
  const volumeConfirmed = volumeMin == null || volRatioValue == null || volRatioValue >= volumeMin;
  const near52wHigh = min52WeekHighRatio == null || ratio52w >= min52WeekHighRatio;
  const aboveEma200 = !requireAboveEma200 || ema200Value == null || current.close >= ema200Value;

  const buy = regime !== "STRONG_DOWNTREND" &&
              regime !== "SIDEWAYS" &&
              scores.bullishScore >= buyScore &&
              scores.bullishScore - scores.bearishScore >= dominance &&
              notOverbought &&
              trendStrongEnough &&
              volumeConfirmed &&
              near52wHigh &&
              aboveEma200;

  const bearishExitSetup = scores.bearishScore >= exitScore && scores.bearishScore - scores.bullishScore >= dominance;
  const positionState = options.positionState ?? "FLAT";
  const signal = buy ? "BUY" : positionState === "LONG" && bearishExitSetup ? "EXIT" : positionState === "LONG" ? "HOLD" : "NO_TRADE";
  const action = signal === "BUY" ? "ENTER_LONG" : signal === "EXIT" ? "EXIT_LONG" : signal === "HOLD" ? "HOLD_LONG" : bearishExitSetup ? "AVOID" : "WAIT";
  const bullishEvidence = unique(scores.components.flatMap((item) => item.bullishReasons));
  const bearishEvidence = unique(scores.components.flatMap((item) => item.bearishReasons));
  const decisionChecks = [];
  if (regime === "STRONG_DOWNTREND" && signal !== "EXIT") decisionChecks.push("BUY blocked by strong downtrend regime");
  if (regime === "SIDEWAYS" && signal !== "EXIT") decisionChecks.push("BUY blocked by sideways regime");
  if (!notOverbought && signal !== "EXIT") decisionChecks.push(`BUY blocked: RSI is overbought (${round(rsiValue)} > ${rsiOverbought})`);
  if (!trendStrongEnough && signal !== "EXIT") decisionChecks.push(`BUY blocked: ADX indicates weak trend (${round(adxValue)} < ${adxMin})`);
  if (!volumeConfirmed && signal !== "EXIT") decisionChecks.push(`BUY blocked: Volume ratio below minimum (${round(volRatioValue)} < ${volumeMin}x)`);
  if (!near52wHigh && signal !== "EXIT") decisionChecks.push(`BUY blocked: Price too far from 52-week high (${round(ratio52w * 100)}% < ${round(min52WeekHighRatio * 100)}%)`);
  if (!aboveEma200 && signal !== "EXIT") decisionChecks.push("BUY blocked: Price below 200-day EMA (long-term downtrend)");
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

/**
 * Generates trading signal and risk parameters for candles up to a specific index.
 * @param {Array<Object>} candles Chronological array of candle objects
 * @param {number} index Target candle index
 * @param {Object} [options={}] Additional configuration and position state options
 * @returns {Object} Signal analysis result
 */
export function generateSignalAtIndex(candles, index, options = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= candles.length) throw new RangeError("index is outside candle range");
  return generateLatest(candles.slice(0, index + 1), { ...options, originalIndex: index });
}

/**
 * Generates trading signals for every candle in the provided series.
 * @param {Array<Object>} candles Chronological array of candle objects
 * @param {Object} [options={}] Strategy options
 * @returns {Array<Object>} Array of signal results for each candle
 */
export function generateSignals(candles, options = {}) {
  return candles.map((_, index) => generateSignalAtIndex(candles, index, options));
}

/**
 * Generates trading signal for the latest candle in the series.
 * @param {Array<Object>} candles Chronological array of candle objects
 * @param {Object} [options={}] Strategy options
 * @returns {Object} Signal analysis result
 */
export function generateSignal(candles, options = {}) {
  return generateSignalAtIndex(candles, candles.length - 1, options);
}

/**
 * Tracks the trade lifecycle, genesis signal, price excursion (MFE/MAE), and current performance.
 * @param {Array<Object>} candles Chronological array of candle objects
 * @param {Object} [options={}] Options including config and lookback limit
 * @returns {Object|null} Signal performance tracking object or null if insufficient history
 */
export function trackSignalPerformance(candles, options = {}) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const config = mergeStrategyConfig(options.config), p = config.periods;
  const minimum = Math.max(p.emaSlow, config.priceAction.breakoutLookback + 1, p.adx * 2);
  const currIdx = candles.length - 1;
  if (candles.length < minimum) return null;

  const lookbackLimit = options.lookbackLimit ?? 90;
  const minIdx = Math.max(minimum - 1, currIdx - lookbackLimit);

  // Simulate alternating trade state machine across the lookback window
  let currentTrade = null;
  let lastClosedTrade = null;
  let lastExitSignal = null;

  for (let i = minIdx; i <= currIdx; i++) {
    if (!currentTrade) {
      // FLAT: Look for BUY setup
      const flatSig = generateSignalAtIndex(candles, i, { ...options, positionState: "FLAT" });
      if (flatSig.signal === "BUY") {
        currentTrade = {
          buyIndex: i,
          buyCandle: candles[i],
          buyPrice: candles[i].close,
          buySignal: flatSig
        };
      } else if (flatSig.action === "AVOID") {
        if (!lastExitSignal) {
          lastExitSignal = {
            exitIndex: i,
            exitCandle: candles[i],
            exitPrice: candles[i].close,
            reason: "AVOID"
          };
        }
      }
    } else {
      // LONG: Monitor active position for stop loss or exit setup
      const longSig = generateSignalAtIndex(candles, i, { ...options, positionState: "LONG" });
      const sl = currentTrade.buySignal.risk?.stopLoss;
      const hitStop = sl != null && candles[i].low <= sl;
      const hitExit = longSig.signal === "EXIT";

      if (hitStop || hitExit) {
        const exitPrice = hitStop ? sl : candles[i].close;
        const returnPercent = round(((exitPrice - currentTrade.buyPrice) / currentTrade.buyPrice) * 100);
        lastClosedTrade = {
          buyIndex: currentTrade.buyIndex,
          buyTimestamp: currentTrade.buyCandle.timestamp,
          buyPrice: round(currentTrade.buyPrice),
          exitIndex: i,
          exitTimestamp: candles[i].timestamp,
          exitPrice: round(exitPrice),
          candlesHeld: i - currentTrade.buyIndex,
          returnPercent,
          reason: hitStop ? "STOP_LOSS" : "EXIT_SIGNAL"
        };
        lastExitSignal = {
          exitIndex: i,
          exitCandle: candles[i],
          exitPrice: round(exitPrice),
          reason: hitStop ? "STOP_LOSS" : "EXIT_SIGNAL"
        };
        currentTrade = null;
      }
    }
  }

  const currentCandle = candles[currIdx];
  const currentPrice = round(currentCandle.close);

  // CASE 1: Active BUY trade is currently open
  if (currentTrade) {
    const genesisCandle = currentTrade.buyCandle;
    const signalPrice = round(currentTrade.buyPrice);
    const priceChange = round(currentPrice - signalPrice);
    const percentChange = round(((currentPrice - signalPrice) / signalPrice) * 100);
    const candlesElapsed = currIdx - currentTrade.buyIndex;

    let highestPriceSince = genesisCandle.high;
    let lowestPriceSince = genesisCandle.low;
    let highestTimestamp = genesisCandle.timestamp;
    let lowestTimestamp = genesisCandle.timestamp;

    for (let i = currentTrade.buyIndex; i <= currIdx; i++) {
      const c = candles[i];
      if (c.high > highestPriceSince) {
        highestPriceSince = c.high;
        highestTimestamp = c.timestamp;
      }
      if (c.low < lowestPriceSince) {
        lowestPriceSince = c.low;
        lowestTimestamp = c.timestamp;
      }
    }

    highestPriceSince = round(highestPriceSince);
    lowestPriceSince = round(lowestPriceSince);
    const maxGainPercent = round(((highestPriceSince - signalPrice) / signalPrice) * 100);
    const maxDrawdownPercent = round(((lowestPriceSince - signalPrice) / signalPrice) * 100);

    const risk = currentTrade.buySignal.risk || {};
    const { stopLoss, target1, target2, entry } = risk;

    const currentSignal = generateSignalAtIndex(candles, currIdx, { ...options, positionState: "LONG" });
    let status = "IN_ZONE";
    let statusLabel = "In Active Zone";
    let guidance = "";

    if (candlesElapsed === 0) {
      status = "FRESH_SIGNAL";
      statusLabel = "Fresh Signal";
      guidance = "BUY signal generated on latest candle. Fresh entry window.";
    } else if (target2 != null && highestPriceSince >= target2) {
      status = "TARGET_2_HIT";
      statusLabel = "Target 2 Reached";
      guidance = `Price reached Target 2 (₹${target2}) with +${maxGainPercent}% peak gain. Rally has unfolded; avoid fresh entry.`;
    } else if (target1 != null && highestPriceSince >= target1) {
      status = "TARGET_1_HIT";
      statusLabel = "Target 1 Reached";
      guidance = `Price reached Target 1 (₹${target1}) with +${maxGainPercent}% peak gain. Reduced risk/reward for new positions.`;
    } else if (percentChange >= 4.0) {
      status = "EXTENDED";
      statusLabel = "Overextended";
      guidance = `Price is already up +${percentChange}% from entry. High risk of pullback; wait for a retest.`;
    } else {
      status = "IN_ZONE";
      statusLabel = "In Entry Zone";
      guidance = `Price is hovering near entry (${percentChange >= 0 ? "+" : ""}${percentChange}%). Trade setup remains valid.`;
    }

    return {
      found: true,
      signalType: "BUY",
      status,
      statusLabel,
      candlesElapsed,
      triggerIndex: currentTrade.buyIndex,
      triggerTimestamp: genesisCandle.timestamp,
      triggerCandle: {
        open: round(genesisCandle.open),
        high: round(genesisCandle.high),
        low: round(genesisCandle.low),
        close: round(genesisCandle.close),
        volume: genesisCandle.volume
      },
      signalPrice,
      currentPrice,
      priceChange,
      percentChange,
      highestPriceSince,
      highestTimestamp,
      maxGainPercent,
      lowestPriceSince,
      lowestTimestamp,
      maxDrawdownPercent,
      riskLevels: {
        entry: entry ?? signalPrice,
        stopLoss,
        target1,
        target2
      },
      currentSignal: currentSignal.signal,
      currentAction: currentSignal.action,
      guidance
    };
  }

  // CASE 2: Position was closed by Stop Loss or EXIT
  if (lastClosedTrade) {
    const exitIndex = lastClosedTrade.exitIndex;
    const exitCandle = candles[exitIndex];
    const signalPrice = round(lastClosedTrade.exitPrice);
    const priceChange = round(currentPrice - signalPrice);
    const percentChange = round(((currentPrice - signalPrice) / signalPrice) * 100);
    const candlesElapsed = currIdx - exitIndex;

    let highestPriceSince = exitCandle.high;
    let lowestPriceSince = exitCandle.low;
    let highestTimestamp = exitCandle.timestamp;
    let lowestTimestamp = exitCandle.timestamp;

    for (let i = exitIndex; i <= currIdx; i++) {
      const c = candles[i];
      if (c.high > highestPriceSince) {
        highestPriceSince = c.high;
        highestTimestamp = c.timestamp;
      }
      if (c.low < lowestPriceSince) {
        lowestPriceSince = c.low;
        lowestTimestamp = c.timestamp;
      }
    }

    highestPriceSince = round(highestPriceSince);
    lowestPriceSince = round(lowestPriceSince);

    const isStopped = lastClosedTrade?.reason === "STOP_LOSS";
    const status = isStopped ? "STOP_LOSS_CLOSED" : candlesElapsed === 0 ? "FRESH_EXIT" : priceChange < 0 ? "CAPITAL_PROTECTED" : "EXIT_ACTIVE";
    const statusLabel = isStopped
      ? "Closed by Stop Loss"
      : candlesElapsed === 0
        ? "Fresh Exit Signal"
        : priceChange < 0
          ? `Capital Protected (-${Math.abs(percentChange)}%)`
          : "Exit / Inactive";

    const guidance = isStopped
      ? `Trade was closed at stop loss (₹${signalPrice}). Price has since moved to ₹${currentPrice} (${percentChange >= 0 ? "+" : ""}${percentChange}%). Avoid re-entry without a fresh confirmed BUY signal.`
      : priceChange < 0
        ? `Price has dropped ${Math.abs(percentChange)}% since EXIT (₹${signalPrice} → ₹${currentPrice}). Exiting protected capital.`
        : `Price has moved ${percentChange >= 0 ? "+" : ""}${percentChange}% since EXIT. Wait for a new confirmed BUY setup.`;

    return {
      found: true,
      signalType: "EXIT",
      status,
      statusLabel,
      candlesElapsed,
      triggerIndex: exitIndex,
      triggerTimestamp: exitCandle.timestamp,
      triggerCandle: {
        open: round(exitCandle.open),
        high: round(exitCandle.high),
        low: round(exitCandle.low),
        close: round(exitCandle.close),
        volume: exitCandle.volume
      },
      signalPrice,
      currentPrice,
      priceChange,
      percentChange,
      highestPriceSince,
      highestTimestamp,
      lowestPriceSince,
      lowestTimestamp,
      closedTrade: lastClosedTrade,
      currentSignal: "EXIT",
      currentAction: "AVOID",
      guidance
    };
  }

  return {
    found: false,
    lookbackCandles: currIdx - minIdx,
    message: `No BUY or EXIT signals found within the last ${currIdx - minIdx} candles.`
  };
}
