import "dotenv/config";

export const config = {
  upstox: {
    accessToken: process.env.UPSTOX_ACCESS_TOKEN ?? null,
    requestsPerSecond: Number(process.env.UPSTOX_REQUESTS_PER_SECOND ?? 10),
    maxRetries: Number(process.env.UPSTOX_MAX_RETRIES ?? 4)
  }
};

export function requireAccessToken(token = config.upstox.accessToken) {
  if (!token) throw new Error("UPSTOX_ACCESS_TOKEN is missing. Add it to .env or pass accessToken.");
  return token;
}
