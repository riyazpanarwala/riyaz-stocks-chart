// Shared contract, confirmation and position rules. No broker orders are sent.
export function marketTimestamp(value) {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const nse = /^(\d{2})-([A-Za-z]{3})-(\d{4})[ ,]+(\d{2}:\d{2}:\d{2})$/.exec(value ?? "");
  if (nse) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months.findIndex((m) => m.toLowerCase() === nse[2].toLowerCase()) + 1;
    return month ? Date.parse(`${nse[3]}-${String(month).padStart(2, "0")}-${nse[1]}T${nse[4]}+05:30`) : NaN;
  }
  // A timestamp without an explicit timezone must not depend on the browser timezone.
  return typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}

export function isFresh(value, now = Date.now(), maxAge = 120_000) {
  const ts = marketTimestamp(value);
  return Number.isFinite(ts) && ts <= now + 5000 && now - ts <= maxAge;
}

export function expiryIsActive(expiry, now = Date.now()) {
  return marketTimestamp(`${expiry} 15:30:00`) > now;
}

export function beforeEntryCutoff(now = Date.now()) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return time >= "09:15" && time < "15:20";
}

export function isolateExpiry(rows = [], selectedExpiry = null) {
  const dates = [...new Set(rows.flatMap((r) => [r.expiryDate, r.CE?.expiryDate, r.PE?.expiryDate]).filter(Boolean))]
    .sort((a, b) => marketTimestamp(`${a} 15:30:00`) - marketTimestamp(`${b} 15:30:00`));
  const expiry = selectedExpiry ?? dates[0] ?? null;
  const filtered = rows.map((r) => ({
    ...r,
    CE: r.CE && (!expiry || (r.CE.expiryDate ?? r.expiryDate) === expiry) ? r.CE : undefined,
    PE: r.PE && (!expiry || (r.PE.expiryDate ?? r.expiryDate) === expiry) ? r.PE : undefined,
  })).filter((r) => r.CE || r.PE);
  const byStrike = new Map();
  for (const row of filtered) {
    if (!Number.isFinite(Number(row.strikePrice)) || Number(row.strikePrice) <= 0) continue;
    const strike = Number(row.strikePrice);
    const previous = byStrike.get(strike);
    byStrike.set(strike, { ...row, strikePrice: strike, CE: row.CE ?? previous?.CE, PE: row.PE ?? previous?.PE });
  }
  return { rows: [...byStrike.values()].sort((a, b) => a.strikePrice - b.strikePrice), expiry, expiries: dates };
}

export function liquidQuote(leg, minVolume = 1000) {
  const bid = Number(leg?.bidprice ?? leg?.bid ?? leg?.buyPrice1);
  const ask = Number(leg?.askPrice ?? leg?.ask ?? leg?.sellPrice1);
  const mid = (bid + ask) / 2;
  const valid = Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask >= bid &&
    [leg?.lastPrice, leg?.openInterest, leg?.totalTradedVolume].every((value) => Number.isFinite(Number(value))) &&
    Number(leg?.lastPrice) > 0 && Number(leg?.openInterest) > 0 &&
    Number(leg?.totalTradedVolume) >= minVolume;
  const spreadPct = valid ? (ask - bid) / mid * 100 : Infinity;
  return { bid, ask, spreadPct, valid: valid && spreadPct <= 3 };
}

export function completedSignalCandles(candles = [], now = Date.now()) {
  return (candles ?? []).filter((c) => {
    const ts = marketTimestamp(c.date);
    return Number.isFinite(ts) && ts + 300_000 <= now && now - (ts + 300_000) <= 900_000 &&
      [c.open, c.high, c.low, c.close].every(Number.isFinite);
  }).sort((a, b) => marketTimestamp(a.date) - marketTimestamp(b.date)).slice(-2);
}

export function confirmedDirection({ candles = [], now = Date.now(), spot }) {
  const [a, b] = completedSignalCandles(candles, now);
  if (!a || !b || marketTimestamp(b.date) - marketTimestamp(a.date) !== 300_000) return 0;
  if (b.close > a.close && b.close > b.open && spot >= b.close) return 1;
  if (b.close < a.close && b.close < b.open && spot <= b.close) return -1;
  return 0;
}

export function buildPositionPlan({ side, entryPrice, spot, invalidationSpot, targetSpot, target2Spot, delta = 0.5, roundTripCost = 0 }) {
  const direction = side === "CE" ? 1 : side === "PE" ? -1 : 0;
  const riskPoints = direction * (spot - invalidationSpot);
  const rewardPoints = direction * (targetSpot - spot);
  if (!direction || ![entryPrice, spot, invalidationSpot, targetSpot, delta, roundTripCost].every(Number.isFinite) ||
      entryPrice <= 0 || delta <= 0 || delta > 1 || riskPoints <= 0 || rewardPoints <= 0 || roundTripCost < 0) return null;
  const risk = riskPoints * delta;
  if (risk >= entryPrice) return null;
  const round = (n) => Math.round(n * 100) / 100;
  const stopLoss = round(entryPrice - risk);
  if (stopLoss <= 0 || stopLoss >= entryPrice) return null;
  const target1 = round(entryPrice + rewardPoints * delta);
  const target2 = round(entryPrice + Math.max(rewardPoints, direction * ((target2Spot ?? targetSpot) - spot)) * delta);
  const riskRewardRatio = (target1 - entryPrice - roundTripCost) / (entryPrice - stopLoss + roundTripCost);
  return { side, entryPrice, entrySpot: spot, invalidationSpot, targetSpot, target2Spot: target2Spot ?? targetSpot,
    stopLoss, target1, target2, maxRisk: round(risk), riskRewardRatio: round(riskRewardRatio),
    eligible: riskRewardRatio >= 1.5, delta, roundTripCost };
}

export function evaluatePosition(position, { bid, spot, timestamp, now = Date.now(), marketOpen = true, rawSignal, confirmed = false }) {
  if (!position) return { action: "NO POSITION", reason: "Record an actual fill to monitor exits." };
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  if (position.openedAt && dayFormat.format(position.openedAt) !== dayFormat.format(now)) return { action: "EXIT", reason: "Recorded intraday position remains open from an earlier session." };
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  if (time >= "15:20" || !marketOpen) return { action: "EXIT", reason: "Intraday time exit; close the recorded position." };
  if (!isFresh(timestamp, now) || !Number.isFinite(bid) || bid <= 0 || !Number.isFinite(spot) || spot <= 0) return { action: "CHECK QUOTE", reason: "Fresh bid and spot required to evaluate exits." };
  if (bid <= position.stopLoss || (position.side === "CE" ? spot <= position.invalidationSpot : spot >= position.invalidationSpot)) return { action: "EXIT", reason: "Stop loss or underlying invalidation reached." };
  if (bid >= position.target2) return { action: "EXIT", reason: "Final premium target reached." };
  if (bid >= position.target1) return { action: "EXIT", reason: "First premium target reached; take profit." };
  if (confirmed && rawSignal === (position.side === "CE" ? "BUY PUT" : "BUY CALL")) return { action: "EXIT", reason: "Confirmed signal reversed against the recorded position." };
  return { action: "HOLD", reason: "Stop, target and time exit have not been reached." };
}

export function revalidateNextDaySetup(setup, { rows, spot, timestamp, candles, now, marketOpen, expiry }) {
  const wait = (reason) => ({ rawSignal: "NO TRADE", reason });
  const contract = setup?.recommendedOption;
  const levels = setup?.tradeLevels;
  if (!contract || !levels) return wait("No conditional setup to revalidate.");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(setup.date ?? "") || setup.date >= day) return wait("This setup is for a later session.");
  if (Date.parse(day) - Date.parse(setup.date) > 4 * 86400000) return wait("The stored setup is too old; obtain a new setup.");
  if (!beforeEntryCutoff(now) || !expiryIsActive(expiry, now)) return wait("Entry cutoff or contract expiry has been reached.");
  if (!marketOpen || !isFresh(timestamp, now) || contract.expiry !== expiry) return wait("Fresh quotes for the setup’s expiry are required during the session.");
  const side = setup.primarySignal === "BUY CE" ? "CE" : "PE";
  const direction = side === "CE" ? 1 : -1;
  const completed = completedSignalCandles(candles, now);
  if (confirmedDirection({ candles: completed, now, spot }) !== direction || completed.length !== 2 ||
      completed.some((c) => direction * (c.close - levels.triggerSpot) <= 0) || direction * (spot - levels.triggerSpot) <= 0) return wait("Wait for two completed 5-minute closes beyond the trigger.");
  if (direction * (spot - levels.triggerSpot) / levels.triggerSpot > 0.008) return wait("Opening move is beyond the chase limit.");
  const leg = rows.find((r) => r.strikePrice === contract.strike)?.[side];
  const quote = liquidQuote(leg);
  if (!quote.valid) return wait("Executable quotes and liquidity must be confirmed again.");
  const plan = buildPositionPlan({ side, entryPrice: quote.ask, spot, invalidationSpot: levels.invalidationSpot,
    targetSpot: levels.targetSpot, delta: contract.isItm ? 0.6 : 0.5 });
  if (!plan?.eligible) return wait("Live entry does not meet 1:1.5 risk/reward.");
  return { rawSignal: side === "CE" ? "BUY CALL" : "BUY PUT", confirmed: true, tradePlan: plan,
    contract: { strike: contract.strike, side, expiry, ...quote }, reason: "Live trigger and liquidity confirmed; record the actual fill." };
}
