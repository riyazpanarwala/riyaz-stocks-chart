import axios from "axios";
import { config, requireAccessToken } from "../config/env.js";

const BASE_URL = "https://api.upstox.com/v3";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createUpstoxClient({ accessToken = config.upstox.accessToken, timeoutMs = 30_000 } = {}) {
  const headers = { Accept: "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return axios.create({ baseURL: BASE_URL, timeout: timeoutMs, headers });
}


async function requestWithRetry({ http, url, operation, maxRetries, baseDelayMs }) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await http.get(url);
      if (response.data?.status && response.data.status !== "success") throw new Error(`Unexpected Upstox status: ${response.data.status}`);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const retryable = status === 429 || status === 408 || (status >= 500 && status <= 599) || !error.response;
      if (attempt >= maxRetries || !retryable) {
        const detail = error.response?.data ?? error.message;
        throw new Error(`Upstox ${operation} request failed (${status ?? "network"}): ${JSON.stringify(detail)}`, { cause: error });
      }
      const retryAfter = Number(error.response?.headers?.["retry-after"]);
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 100);
      await sleep(delay);
    }
  }
}

export async function getHistoricalCandles({
  instrumentKey,
  unit = "days",
  interval = "1",
  toDate,
  fromDate, accessToken, client, maxRetries = config.upstox.maxRetries, baseDelayMs = 500
}) {
  if (!instrumentKey || !toDate || !fromDate) throw new Error("instrumentKey, fromDate and toDate are required");

  const encodedInstrumentKey = encodeURIComponent(instrumentKey);

  const url = `/historical-candle/${encodedInstrumentKey}/${unit}/${interval}/${toDate}/${fromDate}`;
  const http = client ?? createUpstoxClient({ accessToken });
  return requestWithRetry({ http, url, operation: "historical", maxRetries, baseDelayMs });
}

export async function getIntradayCandles({
  instrumentKey, unit = "minutes", interval = 1,
  accessToken, client, maxRetries = config.upstox.maxRetries, baseDelayMs = 500
}) {
  if (!instrumentKey) throw new Error("instrumentKey is required");
  if (!['minutes', 'hours', 'days'].includes(unit)) throw new Error("Intraday unit must be minutes, hours or days");
  const encodedInstrumentKey = encodeURIComponent(instrumentKey);
  const url = `/historical-candle/intraday/${encodedInstrumentKey}/${unit}/${interval}`;
  const http = client ?? createUpstoxClient({ accessToken });
  return requestWithRetry({ http, url, operation: "intraday", maxRetries, baseDelayMs });
}
