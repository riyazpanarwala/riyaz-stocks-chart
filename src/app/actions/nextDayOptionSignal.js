// src/app/actions/nextDayOptionSignal.js
"use server";

import { getNextDayOptionSignal } from "../../services/market/nextDayOptionSignalService.js";

/**
 * Server Action: getNextDayOptionSignalAction
 * Queryable by client UI components.
 * Returns the latest 3:15 PM Next-Day Option Signal.
 *
 * @returns {Promise<object>}
 */
export async function getNextDayOptionSignalAction() {
  try {
    const data = await getNextDayOptionSignal({
      forceRefresh: false,
      dispatchTelegram: false,
      saveReport: false,
    });
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[getNextDayOptionSignalAction] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate next-day option signal",
    };
  }
}
