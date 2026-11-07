import { INDIAN_MARKET_SESSION } from "../config/marketSession.js";

/**
 * Calculate session VWAP and volume-weighted standard deviation bands.
 * Intraday timestamps without an offset are interpreted as Indian market time.
 * @param {Array<object>} candles Intraday candles in ascending timestamp order.
 * @param {{ sessionStart?: string, sessionClose?: string, bands?: number[] }} options Session rules and requested deviation bands.
 * @returns {Array<{vwap: number|null, upper1: number|null, lower1: number|null, upper2: number|null, lower2: number|null}>} Aligned VWAP values.
 */
export function vwap(candles, {
  sessionStart = INDIAN_MARKET_SESSION.start,
  sessionClose = INDIAN_MARKET_SESSION.close,
  bands = [1],
} = {}) {
  const [startHour, startMinute] = sessionStart.split(":").map(Number);
  const [closeHour, closeMinute] = sessionClose.split(":").map(Number);
  let sessionDate = null;
  let cumulativeVolume = 0;
  let cumulativePriceVolume = 0;
  let cumulativePriceSquaredVolume = 0;

  return candles.map((candle) => {
    const date = parseIndianDate(candle?.date);
    const invalid = !date || ![candle?.high, candle?.low, candle?.close, candle?.volume]
      .every((value) => Number.isFinite(Number(value)));
    if (!date) return { vwap: null, upper1: null, lower1: null, upper2: null, lower2: null };

    const day = date.day;
    if (day !== sessionDate) {
      sessionDate = day;
      cumulativeVolume = 0;
      cumulativePriceVolume = 0;
      cumulativePriceSquaredVolume = 0;
    }

    const values = { vwap: null, upper1: null, lower1: null, upper2: null, lower2: null };
    const minuteOfDay = date.hour * 60 + date.minute;
    if (invalid || minuteOfDay < startHour * 60 + startMinute || minuteOfDay > closeHour * 60 + closeMinute || Number(candle.volume) <= 0) return values;

    const high = Number(candle.high), low = Number(candle.low), close = Number(candle.close);
    if (high < low || close < low || close > high) return values;
    const volume = Number(candle.volume);
    const typicalPrice = (high + low + close) / 3;
    cumulativeVolume += volume;
    cumulativePriceVolume += typicalPrice * volume;
    cumulativePriceSquaredVolume += typicalPrice * typicalPrice * volume;
    const average = cumulativePriceVolume / cumulativeVolume;
    const deviation = Math.sqrt(Math.max(0, cumulativePriceSquaredVolume / cumulativeVolume - average * average));
    values.vwap = average;
    if (bands.includes(1)) {
      values.upper1 = average + deviation;
      values.lower1 = average - deviation;
    }
    if (bands.includes(2)) {
      values.upper2 = average + 2 * deviation;
      values.lower2 = average - 2 * deviation;
    }
    return values;
  });
}

/** Parse a candle timestamp into a market-date and time expressed in IST. */
function parseIndianDate(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: INDIAN_MARKET_SESSION.timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(value).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
  }
  if (typeof value !== "string") return null;
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) return null;
    return parseIndianDate(instant);
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?/);
  if (!match) return null;
  const hour = Number(match[2] || 0), minute = Number(match[3] || 0);
  if (hour > 23 || minute > 59) return null;
  const [year, month, dayOfMonth] = match[1].split("-").map(Number);
  const checkDate = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (checkDate.getUTCFullYear() !== year || checkDate.getUTCMonth() !== month - 1 || checkDate.getUTCDate() !== dayOfMonth) return null;
  return { day: match[1], hour, minute };
}
