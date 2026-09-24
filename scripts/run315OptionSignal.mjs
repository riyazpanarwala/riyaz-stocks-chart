// scripts/run315OptionSignal.mjs
// ═══════════════════════════════════════════════════════════════════════════
// CLI RUNNER: 3:15 PM IST NEXT-DAY NIFTY OPTION SIGNAL
// ═══════════════════════════════════════════════════════════════════════════
// Usage:
//   node scripts/run315OptionSignal.mjs
//   node scripts/run315OptionSignal.mjs --telegram   (dispatches to Telegram if configured)
//   node scripts/run315OptionSignal.mjs --json       (outputs raw JSON payload)
// ═══════════════════════════════════════════════════════════════════════════

import { getNextDayOptionSignal } from "../src/services/market/nextDayOptionSignalService.js";

const args = process.argv.slice(2);
const shouldTelegram = args.includes("--telegram");
const isJson = args.includes("--json");
const forceRefresh = args.includes("--refresh");

console.log("\n=========================================================================");
console.log("  🎯 NIFTY 3:15 PM IST NEXT-DAY OPTION SIGNAL ENGINE");
console.log("  Analyzing latest spot structure, option-chain OI, and writing behavior...");
console.log("=========================================================================\n");

try {
  const signalData = await getNextDayOptionSignal({
    forceRefresh,
    dispatchTelegram: shouldTelegram,
    saveReport: true,
  });

  if (isJson) {
    console.log(JSON.stringify(signalData.result, null, 2));
    process.exit(0);
  }

  // Display Section 12 Full Output
  console.log("-------------------------------------------------------------------------");
  console.log(signalData.fullReport);
  console.log("-------------------------------------------------------------------------\n");

  // Display Section 14 Telegram Format Preview
  console.log("📱 TELEGRAM READY PREVIEW:");
  console.log("-------------------------------------------------------------------------");
  console.log(signalData.telegramText);
  console.log("-------------------------------------------------------------------------\n");

  if (shouldTelegram) {
    if (signalData.telegramSent) {
      console.log("✔ Telegram alert dispatched successfully!");
    } else {
      console.log("ℹ Telegram dispatch skipped or credentials missing (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).");
    }
  }

  if (signalData.savedPath) {
    console.log(`💾 Daily report saved to: ${signalData.savedPath}\n`);
  }
} catch (err) {
  console.error(`\n✖ Option Signal analysis failed: ${err.message}`);
  process.exitCode = 1;
}
