"use server";

import axios from "axios";

const BASE_URL = "https://api.upstox.com/v3";

function getUpstoxHeaders() {
  const headers = {
    Accept: "application/json",
  };
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const ALLOWED_TYPES = new Set(["historical", "intraday", "marketTimings"]);
const ALLOWED_INTERVALS = new Set(["minute", "minutes", "day", "days", "1minute", "30minute", "week", "weeks", "month", "months"]);

function isValidDateString(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

/**
 * Server Action: getUpstoxCandlesAction
 * Proxies Upstox candle data requests from the server to bypass browser CORS,
 * injects optional server-side UPSTOX_ACCESS_TOKEN, and validates and encodes all path parameters.
 * @param {Object} params Request parameters
 * @param {string} [params.type="historical"] Query type: "historical", "intraday", or "marketTimings"
 * @param {string} [params.instrumentKey] Instrument key identifier
 * @param {string} [params.interval] Candle interval (e.g. "minutes", "days")
 * @param {number} [params.apiInterval=1] Interval multiplier
 * @param {string} [params.toDate] End date (YYYY-MM-DD)
 * @param {string} [params.fromDate] Start date (YYYY-MM-DD)
 * @returns {Promise<Object>} Upstox API response payload or error object
 */
export async function getUpstoxCandlesAction({
  type = "historical",
  instrumentKey,
  interval,
  apiInterval = 1,
  toDate,
  fromDate,
} = {}) {
  try {
    if (!ALLOWED_TYPES.has(type)) {
      return { error: true, message: `Invalid type: ${type}`, data: { candles: [] } };
    }

    const headers = getUpstoxHeaders();
    let url = "";

    if (type === "marketTimings") {
      const date = toDate || new Date().toISOString().split("T")[0];
      if (!isValidDateString(date)) {
        return { error: true, message: "Invalid date format (expected YYYY-MM-DD)", data: { candles: [] } };
      }
      url = `${BASE_URL}/market/timings/${encodeURIComponent(date)}`;
    } else {
      const rawKey = typeof instrumentKey === "string" ? instrumentKey.trim() : "";
      if (!rawKey) {
        return { error: true, message: "instrumentKey is required", data: { candles: [] } };
      }

      const safeInterval = interval || (type === "intraday" ? "minutes" : "days");
      if (!ALLOWED_INTERVALS.has(safeInterval)) {
        return { error: true, message: `Invalid interval: ${safeInterval}`, data: { candles: [] } };
      }

      const numApiInterval = Number(apiInterval);
      if (!Number.isInteger(numApiInterval) || numApiInterval <= 0) {
        return { error: true, message: "apiInterval must be a positive integer", data: { candles: [] } };
      }

      const encodedKey = encodeURIComponent(rawKey);
      const encodedInterval = encodeURIComponent(safeInterval);
      const encodedApiInterval = encodeURIComponent(String(numApiInterval));

      if (type === "intraday") {
        url = `${BASE_URL}/historical-candle/intraday/${encodedKey}/${encodedInterval}/${encodedApiInterval}`;
      } else {
        if (!isValidDateString(toDate) || !isValidDateString(fromDate)) {
          return { error: true, message: "toDate and fromDate must be valid dates in YYYY-MM-DD format", data: { candles: [] } };
        }
        url = `${BASE_URL}/historical-candle/${encodedKey}/${encodedInterval}/${encodedApiInterval}/${encodeURIComponent(toDate)}/${encodeURIComponent(fromDate)}`;
      }
    }

    const response = await axios.get(url, { headers, timeout: 15000 });
    return response.data;
  } catch (error) {
    const status = error?.response?.status ?? "Server Action Error";
    const details = error?.response?.data ?? error?.message ?? "Unknown error";
    console.error(`[getUpstoxCandlesAction] Error ${status}:`, details);
    return {
      error: true,
      status,
      message: error?.message || "Failed to fetch data from Upstox",
      data: { candles: [] },
    };
  }
}
