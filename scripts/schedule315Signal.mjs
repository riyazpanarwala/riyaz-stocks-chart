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

  const currentHour = parseInt(parts.hour, 10);
  const currentMinute = parseInt(parts.minute, 10);

  // Target: 15:15:00 IST
  const targetHour = 15;
  const targetMinute = 15;

  let daysToAdd = 0;
  if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
    daysToAdd = 1;
  }

  // Create date object for next target
  const nextTarget = new Date(now);
  nextTarget.setDate(nextTarget.getDate() + daysToAdd);

  // Adjust for weekends (Saturday=6, Sunday=0)
  while (nextTarget.getDay() === 0 || nextTarget.getDay() === 6 || isHoliday(nextTarget)) {
    nextTarget.setDate(nextTarget.getDate() + 1);
  }

  return nextTarget;
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

  // Compute exact ms to 15:15 IST
  const targetFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const targetDateStr = targetFormatter.format(nextTarget);
  const targetTimeEpoch = new Date(`${targetDateStr}T15:15:00+05:30`).getTime();
  const msToWait = Math.max(1000, targetTimeEpoch - now.getTime());

  console.log(`Next execution scheduled for: ${targetDateStr} at 15:15:00 IST (in ${(msToWait / 1000 / 60).toFixed(1)} mins)`);

  setTimeout(async () => {
    await runScheduledSignal();
    scheduleLoop();
  }, msToWait);
}

scheduleLoop();
