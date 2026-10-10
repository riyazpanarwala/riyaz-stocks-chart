import { sessionDate } from "./analysis.js";

export function validSetupHistory(history) {
  if (!history || typeof history !== "object" || Array.isArray(history)) return {};
  return Object.fromEntries(Object.entries(history).filter(([date, setup]) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && setup?.date === date &&
    ["BUY CE", "BUY PE"].includes(setup.primarySignal) && setup.recommendedOption && setup.tradeLevels));
}

export function storeNextDaySetup(history, result) {
  const updated = validSetupHistory({ ...validSetupHistory(history), [result?.date]: result });
  return Object.fromEntries(Object.keys(updated).sort().slice(-7).map(date => [date, updated[date]]));
}

export function latestPriorSetup(history, now) {
  const today = sessionDate(now);
  if (!today) return null;
  const eligible = Object.entries(validSetupHistory(history)).filter(([date]) => date < today &&
    Date.parse(today) - Date.parse(date) <= 4 * 86400000).sort(([a], [b]) => b.localeCompare(a));
  return eligible[0]?.[1] ?? null;
}
