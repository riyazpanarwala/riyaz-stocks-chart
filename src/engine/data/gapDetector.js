function weekdayIntervalsBetween(from, to) {
  let count = 0, cursor = new Date(from.getTime() + 86_400_000);
  while (cursor < to) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return count;
}

export function detectGaps(candles, { expectedMinutes, tolerance = 1.5, ignoreDateBoundaries = false, weekdaysOnly = false } = {}) {
  if (!expectedMinutes || candles.length < 2) return [];
  const expectedMs = expectedMinutes * 60_000, gaps = [];
  for (let i = 1; i < candles.length; i++) {
    const from = new Date(candles[i - 1].timestamp), to = new Date(candles[i].timestamp);
    const crossesDate = from.toISOString().slice(0, 10) !== to.toISOString().slice(0, 10);
    if (ignoreDateBoundaries && crossesDate) continue;
    if (weekdaysOnly) {
      const missingIntervals = weekdayIntervalsBetween(from, to);
      if (missingIntervals > 0) gaps.push({ after: candles[i - 1].timestamp, before: candles[i].timestamp, missingIntervals });
      continue;
    }
    const elapsed = to - from;
    if (elapsed > expectedMs * tolerance) gaps.push({ after: candles[i - 1].timestamp, before: candles[i].timestamp, missingIntervals: Math.max(1, Math.round(elapsed / expectedMs) - 1) });
  }
  return gaps;
}
