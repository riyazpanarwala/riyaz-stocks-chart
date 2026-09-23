// src/app/api/sentiment/route.js
import { NextResponse } from "next/server";
import { getMacroSentimentData } from "@/services/market/macroSentimentService.js";

export const dynamic = "force-dynamic";

// Route-level rate limiting & throttling storage for forced refresh requests
const ipRateLimitMap = new Map();
const IP_REFRESH_COOLDOWN_MS = 15 * 1000; // 15 seconds per client IP
const GLOBAL_REFRESH_COOLDOWN_MS = 10 * 1000; // 10 seconds global cooldown
let lastGlobalRefreshTime = 0;

/**
 * Extracts client IP identifier from standard proxy headers for rate limiting.
 * @param {Request} request - Incoming request object.
 * @returns {string} Client IP address or fallback identifier.
 */
function getClientIdentifier(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "anonymous";
}

/**
 * Prunes stale entries from the rate limit map to prevent unbounded memory growth.
 * @param {number} now - Current timestamp in milliseconds.
 */
function pruneRateLimitMap(now) {
  if (ipRateLimitMap.size > 500) {
    for (const [ip, timestamp] of ipRateLimitMap.entries()) {
      if (now - timestamp > IP_REFRESH_COOLDOWN_MS * 4) {
        ipRateLimitMap.delete(ip);
      }
    }
  }
}

/**
 * Route handler for GET /api/sentiment.
 * Returns live or cached FII/DII institutional activity, India VIX regime classification,
 * multi-index breadth, and valuation metrics.
 *
 * @param {Request} request - Incoming Next.js API request.
 * @returns {Promise<NextResponse>} JSON response with sentiment data.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedRefresh = searchParams.get("refresh") === "true";
    const now = Date.now();

    let shouldForceRefresh = false;
    let isThrottled = false;

    if (requestedRefresh) {
      const clientIp = getClientIdentifier(request);
      const lastClientRefresh = ipRateLimitMap.get(clientIp) || 0;

      const isClientCooldown = now - lastClientRefresh < IP_REFRESH_COOLDOWN_MS;
      const isGlobalCooldown = now - lastGlobalRefreshTime < GLOBAL_REFRESH_COOLDOWN_MS;

      if (isClientCooldown || isGlobalCooldown) {
        isThrottled = true;
        shouldForceRefresh = false;
      } else {
        shouldForceRefresh = true;
        ipRateLimitMap.set(clientIp, now);
        lastGlobalRefreshTime = now;
        pruneRateLimitMap(now);
      }
    }

    const data = await getMacroSentimentData({ forceRefresh: shouldForceRefresh });

    const headers = {
      "Cache-Control": shouldForceRefresh
        ? "no-store"
        : "public, max-age=60, stale-while-revalidate=30",
    };

    if (isThrottled) {
      headers["X-RateLimit-Throttled"] = "true";
    }

    return NextResponse.json(data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving /api/sentiment:", error);
    return NextResponse.json(
      { error: "Failed to fetch macro sentiment and market indicators" },
      { status: 500 }
    );
  }
}
