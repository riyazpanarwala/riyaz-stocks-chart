import { mapUpstoxCandles } from "./candleMapper.js";
import { normalizeCandles } from "./candleValidator.js";

function datePartsInIst(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function constructDailyCandleFromIntraday(rows = []) {
  if (!rows.length) return null;
  const { candles } = normalizeCandles(mapUpstoxCandles(rows));
  const latestSessionDate = datePartsInIst(candles.at(-1).timestamp);
  const session = candles.filter((candle) => datePartsInIst(candle.timestamp) === latestSessionDate);
  if (!session.length) return null;
  const first = session[0], last = session.at(-1);
  return {
    timestamp: new Date(`${latestSessionDate}T00:00:00+05:30`).toISOString(),
    open: first.open,
    high: Math.max(...session.map((candle) => candle.high)),
    low: Math.min(...session.map((candle) => candle.low)),
    close: last.close,
    volume: session.reduce((sum, candle) => sum + candle.volume, 0),
    openInterest: last.openInterest,
    source: "UPSTOX_INTRADAY_1MIN_AGGREGATE",
    isPartial: true,
    sourceCandleCount: session.length,
    lastUpdatedAt: last.timestamp
  };
}

export function mergeLiveDailyCandle(historicalCandles, liveCandle) {
  if (!liveCandle) return { candles: historicalCandles, appended: false, replaced: false };
  const liveTime = Date.parse(liveCandle.timestamp);
  const existing = historicalCandles.findIndex((candle) => Date.parse(candle.timestamp) === liveTime);
  if (existing >= 0) {
    const candles = [...historicalCandles];
    candles[existing] = liveCandle;
    return { candles, appended: false, replaced: true };
  }
  return { candles: [...historicalCandles, liveCandle].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)), appended: true, replaced: false };
}
