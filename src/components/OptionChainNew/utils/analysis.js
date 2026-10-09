import { completedSignalCandles, isFresh, marketTimestamp } from "./tradeRules.js";

export function numeric(value) {
  if (value == null || (typeof value === "string" && value.trim() === "") || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Undefined denominators remain unavailable; neither infinity nor a fabricated neutral ratio.
export function ratio(put, call) {
  return numeric(put) != null && numeric(call) > 0 && put >= 0 ? put / call : null;
}

export function sumMetric(rows, get) {
  const values = (rows ?? []).map(get).map(numeric);
  return values.length && values.every((v) => v != null && v >= 0)
    ? values.reduce((sum, v) => sum + v, 0) : null;
}

export function sessionDate(ts) {
  const value = marketTimestamp(ts);
  return Number.isFinite(value) ? new Date(value + 330 * 60000).toISOString().slice(0, 10) : null;
}

export function matchedSnapshots(context = {}) {
  const { timestamp, prevTimestamp, now } = context;
  return context.marketOpen !== false && isFresh(timestamp, now) && isFresh(prevTimestamp, now) &&
    marketTimestamp(timestamp) > marketTimestamp(prevTimestamp) &&
    sessionDate(timestamp) === sessionDate(prevTimestamp) &&
    (context.expiry == null || context.prevExpiry == null || context.expiry === context.prevExpiry);
}

export function classifyChange(priceChange, oiChange, { priceNoise = 0, oiNoise = 0 } = {}) {
  const price = numeric(priceChange), oi = numeric(oiChange);
  if (price == null || oi == null) return "Unavailable";
  if (Math.abs(price) <= Math.max(0, numeric(priceNoise) ?? 0) || Math.abs(oi) <= Math.max(0, numeric(oiNoise) ?? 0)) return "No Change";
  return oi > 0 ? (price > 0 ? "Long Build-up" : "Short Build-up")
    : (price > 0 ? "Short Covering" : "Long Unwinding");
}

export function legActivity(row, side, context = {}) {
  const leg = row?.[side];
  if (!leg || leg.available === false) return { type: "Unavailable", oi: null, price: null, volume: null };
  let oi = numeric(leg.changeinOpenInterest), price = numeric(leg.change);
  const currentOi = numeric(leg.openInterest);
  let priorOi = currentOi != null ? currentOi - (oi ?? 0) : null;
  let volume = numeric(leg.totalTradedVolume);
  if (context.mode === "intraday") {
    const old = context.prevRows?.find((r) => r.strikePrice === row.strikePrice)?.[side];
    if (!matchedSnapshots(context) || !old || old.available === false ||
        leg.expiryDate !== old.expiryDate || !(numeric(old.lastPrice) > 0) || !(numeric(leg.lastPrice) > 0)) {
      return { type: "Unavailable", oi: null, price: null, volume: null };
    }
    const previousOi = numeric(old.openInterest);
    oi = currentOi != null && currentOi >= 0 && previousOi != null && previousOi >= 0 ? currentOi - previousOi : null;
    price = numeric(leg.lastPrice) - numeric(old.lastPrice);
    priorOi = previousOi;
    const currentVolume = numeric(leg.totalTradedVolume), previousVolume = numeric(old.totalTradedVolume);
    volume = currentVolume != null && previousVolume != null && currentVolume >= previousVolume
      ? currentVolume - previousVolume : null;
  }
  const type = currentOi == null || currentOi < 0 || priorOi == null || priorOi < 0
    ? "Unavailable" : classifyChange(price, oi, context);
  return { type, oi, price, volume, priorOi };
}

// Categories store actual classified contracts, rather than assigning net additions
// to whichever category happens to be present at a single strike.
export function aggregateActivity(rows, atm, pitch, context = {}) {
  const categories = ["Long Build-up", "Short Build-up", "Short Covering", "Long Unwinding"];
  const result = { CE: {}, PE: {}, netCE: 0, netPE: 0, positiveAdditionsCE: 0, positiveAdditionsPE: 0, volumeCE: 0, volumePE: 0,
    volumeAvailable: true, bullish: 0, bearish: 0, bias: 0, timeframe: context.mode === "intraday" ? "Matched snapshots" : "Session change" };
  for (const side of ["CE", "PE"]) for (const type of categories) result[side][type] = { contracts: 0, weighted: 0 };
  const local = (rows ?? []).filter(row => Math.abs(row.strikePrice - atm) / pitch <= (context.radius ?? 2));
  const priorTotal = local.reduce((sum, row) => sum + ["CE", "PE"].reduce((s, side) =>
    s + Math.max(0, legActivity(row, side, context).priorOi ?? 0), 0), 0);
  for (const row of rows ?? []) {
    const distance = Math.abs(row.strikePrice - atm) / pitch;
    if (distance > (context.radius ?? 2)) continue;
    for (const side of ["CE", "PE"]) {
      const activity = legActivity(row, side, context);
      if (activity.oi != null) result[`net${side}`] += activity.oi;
      if (activity.oi > 0) result[`positiveAdditions${side}`] += activity.oi;
      if (activity.volume == null) result.volumeAvailable = false;
      else result[`volume${side}`] += activity.volume;
      const bucket = result[side][activity.type];
      if (!bucket) continue;
      bucket.contracts += Math.abs(activity.oi);
      // Contract amounts matter: a tiny newly opened position must not outweigh
      // a large category simply because its prior OI was tiny. Bounded relative
      // growth adds context; a shared prior-OI denominator keeps sides comparable.
      const growth = Math.min(1, Math.abs(activity.oi) / Math.max(1, activity.priorOi ?? 0));
      bucket.weighted += Math.abs(activity.oi) * (1 + growth) / (1 + distance) / Math.max(1, priorTotal);
    }
  }
  const w = (side, type) => result[side][type].weighted;
  result.bullish = w("CE", "Long Build-up") + w("CE", "Short Covering") + w("PE", "Short Build-up") + w("PE", "Long Unwinding");
  result.bearish = w("PE", "Long Build-up") + w("PE", "Short Covering") + w("CE", "Short Build-up") + w("CE", "Long Unwinding");
  if (result.bullish > 0 && result.bullish > result.bearish * 1.35) result.bias = 1;
  else if (result.bearish > 0 && result.bearish > result.bullish * 1.35) result.bias = -1;
  result.positiveAdditionsPCR = ratio(result.positiveAdditionsPE, result.positiveAdditionsCE);
  return result;
}

export function nearestLevels(rows, spot) {
  const resistance = (rows ?? []).filter((r) => r.strikePrice > spot && numeric(r.CE?.openInterest) > 0)
    .sort((a, b) => a.strikePrice - b.strikePrice);
  const support = (rows ?? []).filter((r) => r.strikePrice < spot && numeric(r.PE?.openInterest) > 0)
    .sort((a, b) => b.strikePrice - a.strikePrice);
  return { resistance: resistance[0]?.strikePrice ?? null, support: support[0]?.strikePrice ?? null,
    resistanceCandidates: resistance, supportCandidates: support };
}

export function wallState(row, side, context = {}) {
  const type = legActivity(row, side, context).type;
  return type === "Short Build-up" ? "Inferred writing" : type === "Short Covering" ? "Inferred covering"
    : type === "Long Build-up" ? "Inferred buying" : type === "Long Unwinding" ? "Inferred long unwinding" : type;
}

export function crossedLevel(candles, level, direction, now = Date.now(), spot) {
  if (!(numeric(level) > 0)) return false;
  const completed = completedSignalCandles(candles, now);
  if (completed.length !== 2) return false;
  const [a, b] = completed;
  if (marketTimestamp(b.date) - marketTimestamp(a.date) !== 300000) return false;
  return direction === 1 ? a.close <= level && b.close > level && spot > level
    : a.close >= level && b.close < level && spot < level;
}
