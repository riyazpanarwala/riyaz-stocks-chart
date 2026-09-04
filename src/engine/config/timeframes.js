export const TIMEFRAMES = Object.freeze({
  "1m": { unit: "minutes", interval: 1, maxWindowDays: 30, expectedMinutes: 1 },
  "5m": { unit: "minutes", interval: 5, maxWindowDays: 30, expectedMinutes: 5 },
  "15m": { unit: "minutes", interval: 15, maxWindowDays: 30, expectedMinutes: 15 },
  "30m": { unit: "minutes", interval: 30, maxWindowDays: 90, expectedMinutes: 30 },
  "1h": { unit: "hours", interval: 1, maxWindowDays: 90, expectedMinutes: 60 },
  "1d": { unit: "days", interval: 1, maxWindowDays: 3650, expectedMinutes: 1440 },
  "1w": { unit: "weeks", interval: 1, maxWindowDays: 3650, expectedMinutes: 10080 },
  "1M": { unit: "months", interval: 1, maxWindowDays: 3650, expectedMinutes: null }
});

export function resolveTimeframe(value) {
  const timeframe = TIMEFRAMES[value];
  if (!timeframe) throw new Error(`Unsupported timeframe: ${value}. Use ${Object.keys(TIMEFRAMES).join(", ")}`);
  return { name: value, ...timeframe };
}
