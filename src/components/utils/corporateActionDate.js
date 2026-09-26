// Server Actions preserve Date objects; never split their weekday-based toString().
export function corporateActionDate(value, fallback = "") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : fallback;
}
