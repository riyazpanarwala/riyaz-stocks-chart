// scripts/paperTrade.mjs
import { analyzeStock, formatIstTimestamp } from "../src/engine/quick/analyzeStock.js";
import { generateSignalAtIndex } from "../src/engine/strategy/signalEngine.js";

const args = process.argv.slice(2);
const symbolArg = args.find((a) => !a.startsWith("-"));
const isBse = args.includes("--bse");
const capitalArg = args.find((a) => a.startsWith("--capital="))?.split("=")[1];
const daysArg = args.find((a) => a.startsWith("--days="))?.split("=")[1];
const trailingArg = args.find((a) => a.startsWith("--trailing="))?.split("=")[1];
const initialCapital = capitalArg ? Number(capitalArg) : 50_000;
const lookbackDays = daysArg ? Number(daysArg) : 730;
const useBreakevenTrailing = trailingArg !== "none";

if (!symbolArg) {
  console.log("\nUsage: node scripts/paperTrade.mjs <SYMBOL> [--capital=50000] [--days=730] [--trailing=breakeven|none] [--bse]");
  console.log("Examples:");
  console.log("  node scripts/paperTrade.mjs INFY");
  console.log("  node scripts/paperTrade.mjs INFY --trailing=none");
  console.log("  node scripts/paperTrade.mjs TCS --capital=100000");
  console.log("  node scripts/paperTrade.mjs SUNPHARMA --capital=50000");
  console.log("  node scripts/paperTrade.mjs RELIANCE --bse");
  process.exit(1);
}

const exchange = isBse ? "BSE" : undefined;

try {
  console.log(`\n⏳ Fetching data and simulating paper trading for ${symbolArg.toUpperCase()} with ₹${initialCapital.toLocaleString("en-IN")} capital...`);

  const result = await analyzeStock(symbolArg, {
    exchange,
    lookbackCalendarDays: lookbackDays,
    timeframe: "1d",
  });

  const candles = result.candles || (result.liveMerge ? result.liveMerge.candles : result.datasetMetadata?.candles);
  if (!candles || candles.length < 200) {
    throw new Error(`Insufficient historical candles (${candles?.length ?? 0}). Minimum 200 daily candles required.`);
  }

  let cash = initialCapital;
  let position = null;
  const trades = [];

  for (let i = 200; i < candles.length; i++) {
    const c = candles[i];
    if (!position) {
      const sig = generateSignalAtIndex(candles, i, { positionState: "FLAT" });
      if (sig.signal === "BUY") {
        const qty = Math.floor(cash / c.close);
        if (qty > 0) {
          const cost = qty * c.close;
          cash -= cost;
          position = {
            entryIndex: i,
            entryDate: c.timestamp.slice(0, 10),
            entryPrice: c.close,
            quantity: qty,
            cost,
            stopLoss: sig.risk.stopLoss,
            target1: sig.risk.target1,
            target2: sig.risk.target2,
            target1Hit: false
          };
        }
      }
    } else {
      const longSig = generateSignalAtIndex(candles, i, { positionState: "LONG" });

      if (c.high >= position.target1) {
        position.target1Hit = true;
        if (useBreakevenTrailing) {
          position.stopLoss = Math.max(position.stopLoss, position.entryPrice);
        }
      }

      const hitStop = position.stopLoss != null && c.low <= position.stopLoss;
      const hitTarget2 = position.target2 != null && c.high >= position.target2;
      const hitExit = longSig.signal === "EXIT";

      if (hitStop || hitTarget2 || hitExit || i === candles.length - 1) {
        let exitPrice = c.close;
        let reason = "EXIT_SIGNAL";
        if (hitStop) {
          exitPrice = position.stopLoss;
          reason = position.target1Hit && position.stopLoss >= position.entryPrice ? "BREAKEVEN_STOP" : "STOP_LOSS";
        }
        else if (hitTarget2) { exitPrice = position.target2; reason = "TARGET_2"; }
        else if (i === candles.length - 1) { reason = "END_OF_DATA (OPEN)"; }

        const revenue = position.quantity * exitPrice;
        const pnl = revenue - position.cost;
        const pnlPct = (pnl / position.cost) * 100;
        cash += revenue;

        trades.push({
          tradeNum: trades.length + 1,
          entryDate: position.entryDate,
          exitDate: c.timestamp.slice(0, 10),
          entryPrice: Number(position.entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          quantity: position.quantity,
          cost: Number(position.cost.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          pnlPct: Number(pnlPct.toFixed(2)),
          target1Hit: position.target1Hit,
          reason
        });
        position = null;
      }
    }
  }

  // Performance calculations
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const totalWin = wins.reduce((acc, t) => acc + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
  const avgWin = wins.length ? totalWin / wins.length : 0;
  const avgLoss = losses.length ? totalLoss / losses.length : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin;
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin;
  const netProfit = cash - initialCapital;
  const returnPct = (netProfit / initialCapital) * 100;
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;

  console.log("\n=========================================================================");
  console.log(`  PAPER TRADING REPORT: ${result.instrument.name || result.instrument.symbol} (${result.instrument.symbol})`);
  console.log(`  Exchange: ${result.instrument.exchange || "NSE"} | Candles: ${candles.length} | Capital: ₹${initialCapital.toLocaleString("en-IN")}`);
  console.log("=========================================================================\n");

  if (trades.length === 0) {
    console.log("ℹ No trades generated in this lookback window.\n");
    process.exit(0);
  }

  console.log("--- COMPLETED TRADES ---");
  console.table(
    trades.map((t) => ({
      "#": t.tradeNum,
      "Entry Date": t.entryDate,
      "Exit Date": t.exitDate,
      "Entry (₹)": t.entryPrice.toFixed(2),
      "Exit (₹)": t.exitPrice.toFixed(2),
      Qty: t.quantity,
      "Invested (₹)": t.cost.toFixed(2),
      "P&L (₹)": (t.pnl >= 0 ? "+" : "") + t.pnl.toFixed(2),
      "P&L (%)": (t.pnlPct >= 0 ? "+" : "") + t.pnlPct.toFixed(2) + "%",
      Reason: t.reason,
    }))
  );

  console.log("\n--- KEY PERFORMANCE METRICS ---");
  console.log(`• Starting Capital   : ₹${initialCapital.toLocaleString("en-IN")}`);
  console.log(`• Ending Capital     : ₹${cash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`• Net P&L            : ${netProfit >= 0 ? "+" : ""}₹${netProfit.toFixed(2)} (${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%)`);
  console.log(`• Total Trades       : ${trades.length} (${wins.length} Wins / ${losses.length} Losses)`);
  console.log(`• Win Rate           : ${winRate.toFixed(2)}%`);
  console.log(`• Average Win        : +₹${avgWin.toFixed(2)}`);
  console.log(`• Average Loss       : -₹${avgLoss.toFixed(2)}`);
  console.log(`• Win / Loss Ratio   : ${winLossRatio.toFixed(2)} : 1 (Reward vs Risk per trade)`);
  console.log(`• Profit Factor      : ${profitFactor.toFixed(2)} (Gross Profit / Gross Loss)`);
  console.log("=========================================================================\n");
} catch (error) {
  console.error(`\n✖ Simulation failed: ${error.message}`);
  process.exitCode = 1;
}
