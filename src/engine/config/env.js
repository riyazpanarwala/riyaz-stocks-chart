import "dotenv/config";

function parseNonNegativeInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 ? num : fallback;
}

function parsePositiveNumber(value, fallback) {
  if (value == null || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export const config = {
  upstox: {
    accessToken: process.env.UPSTOX_ACCESS_TOKEN ?? null,
    requestsPerSecond: parsePositiveNumber(process.env.UPSTOX_REQUESTS_PER_SECOND, 10),
    maxRetries: parseNonNegativeInt(process.env.UPSTOX_MAX_RETRIES, 4)
  }
};

/**
 * Validates and retrieves the Upstox access token.
 * @param {string|null} [token=config.upstox.accessToken] Upstox bearer access token
 * @returns {string} The verified access token
 * @throws {Error} When access token is missing or empty
 */
export function requireAccessToken(token = config.upstox.accessToken) {
  if (!token) throw new Error("UPSTOX_ACCESS_TOKEN is missing. Add it to .env or pass accessToken.");
  return token;
}
