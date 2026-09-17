"use server";

import fs from "node:fs/promises";
import path from "node:path";
import {
  generateMarketBriefing,
  DEFAULT_BRIEFING_WATCHLIST,
} from "../../services/ai/marketBriefingService.js";
import { checkScreenerAccessAction } from "./screenerAuth.js";

// In-memory cache for today's generated briefing
let cachedBriefingRecord = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

/**
 * Resolves the server-side reports directory path safely.
 */
function getReportsDirectory() {
  return path.resolve(process.cwd(), "reports");
}

/**
 * Tries to read cached briefing from disk.
 * @param {string} dateStr
 * @returns {Promise<object|null>}
 */
async function readCachedDiskBriefing(dateStr) {
  try {
    const dir = getReportsDirectory();
    const filepath = path.join(dir, `daily-briefing-${dateStr}.json`);
    const raw = await fs.readFile(filepath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Saves briefing JSON to disk for persistence across server restarts.
 * @param {string} dateStr
 * @param {object} payload
 */
async function saveCachedDiskBriefing(dateStr, payload) {
  try {
    const dir = getReportsDirectory();
    await fs.mkdir(dir, { recursive: true });
    const filepath = path.join(dir, `daily-briefing-${dateStr}.json`);
    await fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf8");
  } catch (e) {
    // Non-critical persistence failure
  }
}

/**
 * Server Action: Fetches or generates the AI Daily Market Briefing.
 * Strictly gated behind session passcode authorization.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @param {Array<string>} [options.symbols]
 * @returns {Promise<{ success: boolean, authenticated: boolean, briefing?: object, aggregated?: object, markdown?: string, source?: string, generatedAt?: string, error?: string }>}
 */
export async function getDailyMarketBriefingAction({
  forceRefresh = false,
  symbols = DEFAULT_BRIEFING_WATCHLIST,
} = {}) {
  try {
    // 1. Enforce session authentication gate
    const authCheck = await checkScreenerAccessAction();
    if (!authCheck.authenticated) {
      return {
        success: false,
        authenticated: false,
        error: "Authentication required to access the AI Daily Market Briefing.",
      };
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const now = Date.now();

    // 2. Check in-memory cache
    if (
      !forceRefresh &&
      cachedBriefingRecord &&
      cachedBriefingRecord.dateStr === todayDate &&
      now - cachedBriefingRecord.timestamp < CACHE_TTL_MS
    ) {
      return {
        success: true,
        authenticated: true,
        ...cachedBriefingRecord.data,
        cached: true,
      };
    }

    // 3. Check disk cache if not forcing refresh
    if (!forceRefresh) {
      const diskData = await readCachedDiskBriefing(todayDate);
      if (diskData && diskData.briefing) {
        cachedBriefingRecord = {
          dateStr: todayDate,
          timestamp: now,
          data: diskData,
        };
        return {
          success: true,
          authenticated: true,
          ...diskData,
          cached: true,
        };
      }
    }

    // 4. Generate briefing with graceful quantitative fallback
    const result = await generateMarketBriefing({
      symbols,
      dateStr: todayDate,
      allowFallback: true,
    });

    const payload = {
      briefing: result.briefing,
      aggregated: result.aggregated,
      markdown: result.markdown,
      source: result.source || "gemini",
      generatedAt: new Date().toISOString(),
      dateStr: todayDate,
    };

    // Update in-memory & disk cache
    cachedBriefingRecord = {
      dateStr: todayDate,
      timestamp: now,
      data: payload,
    };

    await saveCachedDiskBriefing(todayDate, payload);

    return {
      success: true,
      authenticated: true,
      ...payload,
      cached: false,
    };
  } catch (error) {
    console.error("[getDailyMarketBriefingAction] Error:", error?.message || error);
    return {
      success: false,
      authenticated: true,
      error: error?.message || "Failed to generate market briefing.",
    };
  }
}
