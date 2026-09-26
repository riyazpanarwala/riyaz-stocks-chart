const dateKey = (date) => date instanceof Date
  ? date.toISOString().slice(0, 10)
  : String(date).slice(0, 10);

// Keep provider OHLCV intact and attach events to the candle containing their date.
export function mergeCorporateActions(candles, events, interval = "1d") {
  const result = candles.map((candle) => ({ ...candle }));
  const dates = result.map((candle) => dateKey(candle.date));
  for (const [plural, singular] of [["dividends", "dividend"], ["splits", "split"]]) {
    for (const event of events?.[plural] ?? []) {
      const day = dateKey(event.date);
      let index = dates.indexOf(day);
      if (index < 0 && (interval === "1wk" || interval === "1mo")) {
        index = dates.findLastIndex((date) => date <= day);
        if (index >= 0) {
          const end = new Date(`${dates[index]}T00:00:00Z`);
          if (interval === "1wk") end.setUTCDate(end.getUTCDate() + 7);
          else end.setUTCMonth(end.getUTCMonth() + 1);
          if (day >= dateKey(end)) index = -1;
        }
      }
      if (index < 0) continue;
      const candle = result[index];
      const existing = candle[plural] ?? (candle[singular] ? [candle[singular]] : []);
      if (existing.some((item) => dateKey(item.date) === day)) continue;
      candle[plural] = [...existing, { ...event }];
      candle[singular] = candle[plural][0];
    }
  }
  return result;
}
