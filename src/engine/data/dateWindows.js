function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date format (expected YYYY-MM-DD): ${value}`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return date;
}
const format = (date) => date.toISOString().slice(0, 10);

/**
 * Splits a date range into sequential non-overlapping windows of at most maxWindowDays.
 * @param {string} fromDate Start date in YYYY-MM-DD format
 * @param {string} toDate End date in YYYY-MM-DD format
 * @param {number} maxWindowDays Maximum days per window
 * @returns {Array<{fromDate: string, toDate: string}>} Array of window date ranges
 * @throws {Error} When dates are invalid, out of order, or maxWindowDays is not a positive integer
 */
export function createDateWindows(fromDate, toDate, maxWindowDays) {
  if (!Number.isInteger(maxWindowDays) || maxWindowDays <= 0) {
    throw new Error("maxWindowDays must be a positive integer");
  }
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
