import { QUICK_ANALYSIS_DEFAULTS, resolveInstrument } from "../config/quickAnalysis.js";
import { downloadHistoricalDataset } from "../data/downloader.js";
import { getIntradayCandles } from "../api/upstox.js";
import { constructDailyCandleFromIntraday, mergeLiveDailyCandle } from "../data/liveCandle.js";
import { generateSignal } from "../strategy/signalEngine.js";

const formatDate = (date) => date.toISOString().slice(0, 10);

export function defaultDateRange(now = new Date(), lookbackCalendarDays = QUICK_ANALYSIS_DEFAULTS.lookbackCalendarDays) {
  const parts = istParts(now);
  const today = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
  const to = new Date(today.getTime() - 86_400_000);
  const from = new Date(to.getTime() - lookbackCalendarDays * 86_400_000);
  return { fromDate: formatDate(from), toDate: formatDate(to) };
}

function istParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

export function isLikelyNseMarketOpen(now = new Date()) {
  const parts = istParts(now);
  if (["Sat", "Sun"].includes(parts.weekday)) return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30;
}

export async function analyzeStock(symbolOrKey, options = {}) {
  const settings = { ...QUICK_ANALYSIS_DEFAULTS, ...options };
  const instrument = resolveInstrument(symbolOrKey, options.instruments);
  const range = options.fromDate && options.toDate
    ? { fromDate: options.fromDate, toDate: options.toDate }
    : defaultDateRange(options.now, settings.lookbackCalendarDays);
  const downloader = options.downloader ?? downloadHistoricalDataset;
  const dataset = await downloader({
    instrumentKey: instrument.instrumentKey,
    timeframe: settings.timeframe,
    ...range,
    requestsPerSecond: settings.requestsPerSecond
  });
  let analysisCandles = dataset.candles;
  let liveCandle = null;
  let liveError = null;
  let liveMerge = { appended: false, replaced: false };
  if (settings.includeLiveCandle && settings.timeframe === "1d") {
    const intradayFetcher = options.intradayFetcher ?? getIntradayCandles;
    try {
      const response = await intradayFetcher({ instrumentKey: instrument.instrumentKey, unit: "minutes", interval: settings.liveIntervalMinutes });
      liveCandle = constructDailyCandleFromIntraday(response.data?.candles ?? []);
      if (liveCandle) {
        liveCandle.isPartial = isLikelyNseMarketOpen(options.now);
        liveMerge = mergeLiveDailyCandle(dataset.candles, liveCandle);
        analysisCandles = liveMerge.candles;
      }
    } catch (error) {
      liveError = error.message;
    }
  }
  const signal = generateSignal(analysisCandles, {
    positionState: settings.positionState,
    config: options.strategyConfig
  });
  const candleStatus = liveCandle
    ? liveCandle.isPartial ? "LIVE_PARTIAL" : "INTRADAY_SESSION_COMPLETE"
    : "HISTORICAL_ONLY";
  return { instrument, timeframe: settings.timeframe, range, datasetMetadata: dataset.metadata, liveCandle, liveMerge, liveError, candleStatus, signal };
}

const value = (number, digits = 2) => number == null ? "N/A" : Number(number).toFixed(digits);

export function formatIstTimestamp(timestamp) {
  if (!timestamp) return "N/A";
  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true
  }).format(new Date(timestamp))} IST`;
}

export function formatCompactAnalysis(result) {
  const { instrument, timeframe, signal, liveCandle, candleStatus, liveError } = result;
  const lines = [
    `${instrument.symbol} (${timeframe}) — ${signal.signal} / ${signal.action}`,
    `Candle: ${formatIstTimestamp(signal.timestamp)}`,
    candleStatus === "LIVE_PARTIAL"
      ? `Data: LIVE / PRELIMINARY (${liveCandle.sourceCandleCount} × 1-minute candles; updated ${formatIstTimestamp(liveCandle.lastUpdatedAt)})`
      : candleStatus === "INTRADAY_SESSION_COMPLETE"
        ? `Data: TODAY'S INTRADAY SESSION (${liveCandle.sourceCandleCount} × 1-minute candles)`
        : "Data: LATEST COMPLETED HISTORICAL CANDLE",
    `Price: ₹${value(signal.price)} | Regime: ${signal.marketRegime}`,
    `Bullish: ${signal.bullishScore ?? "N/A"}/100 | Bearish: ${signal.bearishScore ?? "N/A"}/100 | Strength: ${signal.signalStrength ?? "N/A"}`,
    `RSI: ${value(signal.indicators.rsi)} | ADX: ${value(signal.indicators.adx)} | Volume: ${value(signal.indicators.volumeRatio)}x`
  ];
  if (liveError) lines.push(`Live-data warning: ${liveError}`);
  if (signal.signal === "BUY" && signal.risk?.entry != null) {
    lines.push(`Entry: ₹${value(signal.risk.entry)} | SL: ₹${value(signal.risk.stopLoss)} | T1: ₹${value(signal.risk.target1)} | T2: ₹${value(signal.risk.target2)}`);
  }
  const evidence = signal.evidence;
  if (evidence) {
    const bullish = evidence.bullish?.length ? evidence.bullish.join("; ") : "None";
    const bearish = evidence.bearish?.length ? evidence.bearish.join("; ") : "None";
    if (signal.signal === "BUY") {
      lines.push(`Bullish evidence: ${bullish}`);
      if (evidence.bearish?.length) lines.push(`Opposing risks: ${bearish}`);
    } else if (signal.signal === "EXIT") {
      lines.push(`Bearish evidence: ${bearish}`);
      if (evidence.bullish?.length) lines.push(`Counter-evidence: ${bullish}`);
    } else {
      lines.push(`Bullish evidence: ${bullish}`);
      lines.push(`Bearish evidence: ${bearish}`);
    }
    if (evidence.decisionChecks?.length) lines.push(`Decision checks: ${evidence.decisionChecks.join("; ")}`);
  } else if (signal.reasons?.length) {
    lines.push(`Reasons: ${signal.reasons.join("; ")}`);
  }
  return lines.join("\n");
}
