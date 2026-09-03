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

/**
 * Server Action: getUpstoxCandlesAction
 * Proxies Upstox candle data requests from the server to bypass browser CORS,
 * injects optional server-side UPSTOX_ACCESS_TOKEN, and properly encodes instrumentKey.
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
    const rawKey = typeof instrumentKey === "string" ? instrumentKey.trim() : "";
    if (!rawKey) {
      return { error: true, message: "instrumentKey is required", data: { candles: [] } };
    }

    const encodedKey = encodeURIComponent(rawKey);
    const headers = getUpstoxHeaders();

    let url = "";
    if (type === "intraday") {
      url = `${BASE_URL}/historical-candle/intraday/${encodedKey}/${interval || "minutes"}/${apiInterval}`;
    } else if (type === "marketTimings") {
      const date = toDate || new Date().toISOString().split("T")[0];
      url = `${BASE_URL}/market/timings/${date}`;
    } else {
      url = `${BASE_URL}/historical-candle/${encodedKey}/${interval || "days"}/${apiInterval}/${toDate}/${fromDate}`;
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
