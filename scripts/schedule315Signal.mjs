// scripts/schedule315Signal.mjs
// ═══════════════════════════════════════════════════════════════════════════
// 3:15 PM IST AUTOMATED SCHEDULER FOR NIFTY NEXT-DAY OPTION SIGNAL
// ═══════════════════════════════════════════════════════════════════════════
// Usage:
//   node scripts/schedule315Signal.mjs
// Runs continuously, evaluates market hours, fires automatically at 15:15 IST
// on every active trading day, and dispatches Telegram alerts.
// ═══════════════════════════════════════════════════════════════════════════

import { isHoliday } from "../src/components/utils/indianstockmarket.js";
import { getNextDayOptionSignal } from "../src/services/market/nextDayOptionSignalService.js";

function getNext315IstDate() {
  const now = new Date();
  // Get current time in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});

  const currentYear = parseInt(parts.year, 10);
  const currentMonth = parseInt(parts.month, 10);
  const currentDay = parseInt(parts.day, 10);
  const currentHour = parseInt(parts.hour, 10);
  const currentMinute = parseInt(parts.minute, 10);

  // Target: 15:15:00 IST
  const targetHour = 15;
  const targetMinute = 15;

  let daysToAdd = 0;
  if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
    daysToAdd = 1;
  }

  // Construct target Date in IST (15:15:00 IST = 09:45:00 UTC)
  const target = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay + daysToAdd, 9, 45, 0));

  // Forward through holidays and weekends
  while (isHoliday(target)) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target;
}

async function runScheduledSignal() {
  console.log(`\n⏰ [${new Date().toISOString()}] Firing 3:15 PM IST Next-Day Option Signal...`);
  try {
    const res = await getNextDayOptionSignal({
      forceRefresh: true,
      dispatchTelegram: true,
      saveReport: true,
    });

    console.log("✔ 3:15 PM Signal Execution Complete:");
    console.log(`  • Signal: ${res.result.primarySignal}`);
    console.log(`  • Score:  ${res.result.finalScore}`);
    console.log(`  • Status: ${res.result.status}`);
    if (res.telegramSent) {
      console.log("  • Telegram: Dispatched successfully");
    } else {
      console.warn("  • Telegram: Not sent (check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env)");
    }
  } catch (err) {
    console.error("✖ Scheduled run error:", err.message);
  }
}

console.log("=========================================================================");
console.log("  🕒 NIFTY 3:15 PM IST NEXT-DAY OPTION SIGNAL SCHEDULER STARTED");
console.log("=========================================================================");

function scheduleLoop() {
  const now = new Date();
  const nextTarget = getNext315IstDate();
  const msToWait = Math.max(1000, nextTarget.getTime() - now.getTime());

  const targetDateStr = nextTarget.toISOString().slice(0, 10);
  console.log(`Next execution scheduled for: ${targetDateStr} at 15:15:00 IST (in ${(msToWait / 1000 / 60).toFixed(1)} mins)`);

  setTimeout(async () => {
    await runScheduledSignal();
    scheduleLoop();
  }, msToWait);
}

scheduleLoop();
