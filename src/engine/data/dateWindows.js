function parseDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}
const format = (date) => date.toISOString().slice(0, 10);

export function createDateWindows(fromDate, toDate, maxWindowDays) {
  const start = parseDate(fromDate), end = parseDate(toDate);
  if (start > end) throw new Error("fromDate must be on or before toDate");
  const windows = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const windowEnd = new Date(Math.min(end.getTime(), cursor.getTime() + (maxWindowDays - 1) * 86_400_000));
    windows.push({ fromDate: format(cursor), toDate: format(windowEnd) });
    cursor = new Date(windowEnd.getTime() + 86_400_000);
  }
  return windows;
}
