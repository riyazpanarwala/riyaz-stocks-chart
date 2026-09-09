// scripts/marketBriefing.mjs
import fs from "node:fs/promises";
import path from "node:path";
import {
  generateMarketBriefing,
  DEFAULT_BRIEFING_WATCHLIST,
} from "../src/services/ai/marketBriefingService.js";

const args = process.argv.slice(2);
const customListArg = args.find((a) => !a.startsWith("-"));
const symbolsToScan = customListArg
  ? customListArg.split(",").map((s) => s.trim().toUpperCase())
  : DEFAULT_BRIEFING_WATCHLIST;

const shouldSave = !args.includes("--no-save");
const isJsonOnly = args.includes("--json");

console.log("\n=========================================================================");
console.log("  🤖 GEMINI AI AUTOMATED DAILY MARKET BRIEFING & WATCHLIST");
console.log(`  Scanning ${symbolsToScan.length} liquid Indian stocks for high-conviction setups...`);
console.log("=========================================================================\n");

try {
  const result = await generateMarketBriefing({
    symbols: symbolsToScan,
    onProgress: ({ current, total, symbol }) => {
      process.stdout.write(`\r[${current}/${total}] Analyzing ${symbol.padEnd(12)}... `);
    },
  });

  process.stdout.write("Done!\n\n");

  if (isJsonOnly) {
    console.log(JSON.stringify(result.briefing, null, 2));
  } else {
    console.log("-------------------------------------------------------------------------");
    console.log(`📌 MARKET SENTIMENT: ${result.briefing.marketSentiment}`);
    console.log(`🎯 THEME: ${result.briefing.sentimentHeadline}`);
    console.log("-------------------------------------------------------------------------");
    console.log(`\n${result.briefing.executiveSummary}\n`);

    console.log("📈 MARKET BREADTH:");
    console.log(`   Bullish: ${result.aggregated.breadth.bullishPct}% | Bearish: ${result.aggregated.breadth.bearishPct}% | Neutral: ${result.aggregated.breadth.neutralPct}%\n`);

    if (result.briefing.topSwingSetups?.length > 0) {
      console.log("🚀 TOP SWING CANDIDATES FOR TOMORROW:");
      for (const setup of result.briefing.topSwingSetups) {
        console.log(`\n  ⭐ ${setup.symbol} (${setup.setupType})`);
        console.log(`     Entry Zone: ${setup.entryZone}`);
        console.log(`     Stop Loss:  ${setup.stopLoss}`);
        console.log(`     Target:     ${setup.target}`);
        console.log(`     Thesis:     ${setup.rationale}`);
      }
    } else {
      console.log("⚪ No high-conviction swing setups passed all risk filters today.");
    }

    if (result.briefing.riskWatchlist?.length > 0) {
      console.log("\n⚠️  ACTIVE RISK & EXIT WATCHLIST:");
      for (const risk of result.briefing.riskWatchlist) {
        console.log(`   - ${risk.symbol}: ${risk.warning}`);
      }
    }

    if (result.briefing.tacticalGameplan?.length > 0) {
      console.log("\n🛡️  TRADER'S TACTICAL GAMEPLAN:");
      for (const rule of result.briefing.tacticalGameplan) {
        console.log(`   • ${rule}`);
      }
    }
  }

  if (shouldSave) {
    const today = new Date().toISOString().slice(0, 10);
    const reportsDir = path.resolve(process.cwd(), "reports");
    await fs.mkdir(reportsDir, { recursive: true });
    const filename = `daily-briefing-${today}.md`;
    const filepath = path.join(reportsDir, filename);

    await fs.writeFile(filepath, result.markdown, "utf8");
    console.log("\n=========================================================================");
    console.log(`💾 Briefing report saved to: reports/${filename}`);
    console.log("=========================================================================\n");
  }
} catch (error) {
  console.error(`\n✖ Briefing generation failed: ${error.message}`);
  if (error.message.includes("GEMINI_API_KEY")) {
    console.error("Tip: Make sure GEMINI_API_KEY is configured in your .env file or environment variables.");
  }
  process.exitCode = 1;
}
