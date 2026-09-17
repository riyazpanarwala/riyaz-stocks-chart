/**
 * marketBriefingService.js
 * Service for generating automated daily market briefings and top swing setups using Gemini AI.
 */

import { generateGeminiResponse } from "./geminiService.js";
import { analyzeStock } from "../../engine/quick/analyzeStock.js";

/**
 * Default liquid Indian equity watchlist for daily briefing.
 */
export const DEFAULT_BRIEFING_WATCHLIST = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "BHARTIARTL",
  "SBIN",
  "ITC",
  "LT",
  "SUNPHARMA",
  "TITAN",
  "BAJFINANCE",
  "MARUTI",
  "BEL",
  "NIFTYBEES",
  "BANKBEES",
];

/**
 * Aggregates raw stock analysis results into structured market breadth and candidate groups.
 * @param {Array<object>} scanResults
 * @returns {object} Market breadth and categorized candidates
 */
export function aggregateMarketData(scanResults = []) {
  const valid = scanResults.filter((r) => r && r.signal);
  const total = valid.length;

  if (total === 0) {
    return {
      total: 0,
      breadth: { bullishPct: 0, bearishPct: 0, neutralPct: 0 },
      regimes: {},
      buyCandidates: [],
      exitCandidates: [],
      overextendedCandidates: [],
      topSetups: [],
    };
  }

  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  const regimes = {};
  const buyCandidates = [];
  const exitCandidates = [];
  const overextendedCandidates = [];

  for (const item of valid) {
    const sig = item.signal;
    const symbol = item.symbol || item.instrument?.symbol || "UNKNOWN";
    const regime = sig.marketRegime || "UNKNOWN";
    regimes[regime] = (regimes[regime] || 0) + 1;

    const isBearish =
      sig.signal === "EXIT" ||
      sig.action === "AVOID" ||
      regime.includes("DOWNTREND") ||
      (sig.bearishScore >= 45 && sig.bearishScore > (sig.bullishScore || 0));

    if (sig.signal === "BUY") {
      bullishCount++;
      buyCandidates.push({
        symbol,
        name: item.instrument?.name || symbol,
        price: sig.price,
        regime,
        strength: sig.signalStrength || 0,
        bullishScore: sig.bullishScore || 0,
        rsi: sig.indicators?.rsi,
        adx: sig.indicators?.adx,
        volRatio: sig.indicators?.volumeRatio,
        atr: sig.indicators?.atr,
        risk: sig.risk,
        evidence: sig.evidence?.bullish || [],
      });
    } else if (isBearish) {
      bearishCount++;
      const riskReasons = [
        ...(sig.evidence?.bearish || []),
        ...(sig.reasons?.filter((r) => r.toLowerCase().includes("down") || r.toLowerCase().includes("blocked") || r.toLowerCase().includes("below") || r.toLowerCase().includes("ema")) || []),
      ];
      exitCandidates.push({
        symbol,
        name: item.instrument?.name || symbol,
        price: sig.price,
        regime,
        reason: sig.action === "AVOID" ? "Bearish Structure" : sig.action,
        bearishScore: sig.bearishScore || 0,
        risks: riskReasons.length > 0 ? [...new Set(riskReasons)] : [`Active ${regime.replace(/_/g, " ").toLowerCase()} structure`],
      });
    } else {
      neutralCount++;
      if (sig.freshEntryBlocked) {
        overextendedCandidates.push({
          symbol,
          name: item.instrument?.name || symbol,
          price: sig.price,
          status: sig.maturedSignalStatus || "Rally Extended",
        });
      }
    }
  }

  // Sort buy candidates by strength descending, exit candidates by bearishScore descending
  buyCandidates.sort((a, b) => b.strength - a.strength);
  exitCandidates.sort((a, b) => b.bearishScore - a.bearishScore);

  return {
    total,
    breadth: {
      bullishPct: Math.round((bullishCount / total) * 100),
      bearishPct: Math.round((bearishCount / total) * 100),
      neutralPct: Math.round((neutralCount / total) * 100),
    },
    regimes,
    buyCandidates,
    exitCandidates,
    overextendedCandidates,
    topSetups: buyCandidates.slice(0, 3),
  };
}

/**
 * Builds prompt for Gemini to synthesize a structured market briefing.
 * @param {object} aggregated
 * @param {string} [dateStr]
 * @returns {string} Prompt text
 */
export function buildMarketBriefingPrompt(aggregated, dateStr = new Date().toISOString().slice(0, 10)) {
  const { total, breadth, regimes, buyCandidates, exitCandidates, overextendedCandidates } = aggregated;

  const regimeSummary = Object.entries(regimes)
    .map(([reg, count]) => `${reg}: ${count} stocks`)
    .join(", ");

  const buyDetails = buyCandidates.length > 0
    ? buyCandidates.map((b) => {
        return `- ${b.symbol} (${b.name}): Price ₹${Number(b.price).toFixed(2)}, Strength ${b.strength}/100, RSI ${b.rsi ? Number(b.rsi).toFixed(1) : "N/A"}, ADX ${b.adx ? Number(b.adx).toFixed(1) : "N/A"}, Vol ${b.volRatio ? Number(b.volRatio).toFixed(1) + "x" : "N/A"}. Entry: ₹${b.risk?.entry ? Number(b.risk.entry).toFixed(2) : "N/A"}, SL: ₹${b.risk?.stopLoss ? Number(b.risk.stopLoss).toFixed(2) : "N/A"}, T1: ₹${b.risk?.target1 ? Number(b.risk.target1).toFixed(2) : "N/A"}. Catalysts: ${b.evidence.slice(0, 2).join("; ")}`;
      }).join("\n")
    : "No confirmed fresh BUY setups today (Market consolidating).";

  const exitDetails = exitCandidates.length > 0
    ? exitCandidates.map((e) => `- ${e.symbol}: Price ₹${Number(e.price).toFixed(2)}, Bearish score ${e.bearishScore}. Risks: ${e.risks.slice(0, 2).join("; ")}`).join("\n")
    : "No urgent exit warnings triggered.";

  const overextendedDetails = overextendedCandidates.length > 0
    ? overextendedCandidates.map((o) => `${o.symbol} (${o.status})`).join(", ")
    : "None";

  return `You are a Chief Market Strategist & Technical Portfolio Manager covering Indian Equities (NSE/BSE).
Today's Date: ${dateStr}

Market Scan Quantitative Data:
- Universe Scanned: ${total} liquid market leaders
- Market Breadth: ${breadth.bullishPct}% Bullish, ${breadth.bearishPct}% Bearish, ${breadth.neutralPct}% Neutral / Choppy
- Market Regimes Breakdown: ${regimeSummary || "N/A"}
- Overextended / Rally Matured Stocks (Avoid Fresh Entry): ${overextendedDetails}

Top Confirmed Breakout / Momentum Candidates:
${buyDetails}

Active Risk / Exit Warnings:
${exitDetails}

Task:
Produce a tactical end-of-day market briefing and swing trading gameplan for tomorrow.
Respond strictly with valid JSON with this exact schema:
{
  "marketSentiment": "BULLISH" | "CAUTIOUS_BULLISH" | "RANGEBOUND_CONSOLIDATION" | "BEARISH_CORRECTION",
  "sentimentHeadline": "Short punchy headline (e.g. Selective Stock-Picking Market Amid Sector Rotation)",
  "executiveSummary": "2 to 3 sentences summarizing the overall state of the market, liquidity flow, and trend strength.",
  "topSwingSetups": [
    {
      "symbol": "TICKER",
      "setupType": "e.g. Trend Continuation Breakout / Pullback Retest",
      "entryZone": "e.g. ₹2950 - ₹2970",
      "stopLoss": "e.g. ₹2890",
      "target": "e.g. ₹3050 - ₹3100",
      "rationale": "1 to 2 sentences explaining the catalyst and volume profile."
    }
  ],
  "riskWatchlist": [
    {
      "symbol": "TICKER",
      "warning": "e.g. RSI Divergence / Loss of 20 EMA / Profit Taking advised"
    }
  ],
  "tacticalGameplan": [
    "Actionable trading rule 1 for tomorrow's session",
    "Actionable trading rule 2 for risk and position sizing"
  ]
}`;
}

/**
 * Formats a generated briefing JSON object into a polished Markdown document.
 * @param {object} briefingData - Output from Gemini
 * @param {object} aggregated - Aggregated scan stats
 * @param {string} [dateStr]
 * @returns {string} Formatted Markdown
 */
export function formatBriefingMarkdown(briefingData, aggregated = {}, dateStr = new Date().toISOString().slice(0, 10)) {
  const { breadth = { bullishPct: 0, bearishPct: 0, neutralPct: 0 }, total = 0 } = aggregated;

  let md = `# 📊 Indian Markets Daily Briefing & Swing Watchlist\n`;
  md += `**Date:** ${dateStr} | **Universe Scanned:** ${total} Stocks | **Sentiment:** \`${briefingData.marketSentiment || "NEUTRAL"}\`\n\n`;

  md += `## 🎯 ${briefingData.sentimentHeadline || "Market Overview"}\n`;
  md += `${briefingData.executiveSummary || "N/A"}\n\n`;

  md += `### 📈 Market Breadth Snapshot\n`;
  md += `- **Bullish:** ${breadth.bullishPct}%\n`;
  md += `- **Neutral / Choppy:** ${breadth.neutralPct}%\n`;
  md += `- **Bearish / Distribution:** ${breadth.bearishPct}%\n\n`;

  md += `## 🚀 Tomorrow's Top Swing Setups\n`;
  if (briefingData.topSwingSetups && briefingData.topSwingSetups.length > 0) {
    for (const setup of briefingData.topSwingSetups) {
      md += `### ${setup.symbol} — *${setup.setupType}*\n`;
      md += `- **Entry Zone:** ${setup.entryZone}\n`;
      md += `- **Stop Loss:** ${setup.stopLoss}\n`;
      md += `- **Target:** ${setup.target}\n`;
      md += `- **Rationale:** ${setup.rationale}\n\n`;
    }
  } else {
    md += `*No high-confluence swing setups met strict risk criteria today. Focus on capital preservation.*\n\n`;
  }

  if (briefingData.riskWatchlist && briefingData.riskWatchlist.length > 0) {
    md += `## ⚠️ Risk & Distribution Alerts\n`;
    for (const risk of briefingData.riskWatchlist) {
      md += `- **${risk.symbol}:** ${risk.warning}\n`;
    }
    md += `\n`;
  }

  if (briefingData.tacticalGameplan && briefingData.tacticalGameplan.length > 0) {
    md += `## 🛡️ Trader's Tactical Gameplan\n`;
    for (const plan of briefingData.tacticalGameplan) {
      md += `1. ${plan}\n`;
    }
    md += `\n`;
  }

  md += `---\n*Generated automatically by riyaz-stocks-chart & Google Gemini AI*\n`;
  return md;
}

/**
 * Generates a structured fallback briefing using rule-based quantitative metrics
 * when Gemini AI is unreachable or API key is not configured.
 * @param {object} aggregated
 * @param {string} [dateStr]
 * @returns {object} Structured briefing payload
 */
export function generateFallbackBriefing(aggregated, dateStr = new Date().toISOString().slice(0, 10)) {
  const { breadth = { bullishPct: 0, bearishPct: 0, neutralPct: 0 }, buyCandidates = [], exitCandidates = [], regimes = {}, total = 0 } = aggregated;

  let marketSentiment = "RANGEBOUND_CONSOLIDATION";
  let sentimentHeadline = "Equilibrium Market With Selective Opportunities";
  let executiveSummary = "Markets are currently oscillating within key moving average bands with balanced participation between buyers and sellers. Stock-specific action prevails over broad-based index momentum.";

  const strongDowntrends = (regimes["STRONG_DOWNTREND"] || 0) + (regimes["DOWNTREND"] || 0);

  if (breadth.bearishPct >= 40 || strongDowntrends >= Math.max(1, Math.round(total * 0.4))) {
    marketSentiment = "BEARISH_CORRECTION";
    sentimentHeadline = "Broad Distribution & Downside Trend Domination";
    executiveSummary = `Markets are facing persistent distribution pressure with ${breadth.bearishPct}% of liquid leaders under bearish or distribution conditions. Defensive positioning and strict capital preservation are advised over fresh long exposure.`;
  } else if (breadth.bullishPct >= 60) {
    marketSentiment = "BULLISH";
    sentimentHeadline = "Broad Bullish Expansion & Upward Momentum";
    executiveSummary = `Bullish breadth dominates at ${breadth.bullishPct}% of liquid leaders. Institutional accumulation is evident in trend continuation breakouts with healthy volume expansion.`;
  } else if (breadth.bullishPct >= 35) {
    marketSentiment = "CAUTIOUS_BULLISH";
    sentimentHeadline = "Selective Stock-Picking Market with Sector Divergence";
    executiveSummary = `Market breadth shows selective strength with ${breadth.bullishPct}% bullish participation. Traders should favor high-relative-strength leaders while keeping position sizing prudent.`;
  }

  const topSwingSetups =
    marketSentiment === "BEARISH_CORRECTION"
      ? []
      : buyCandidates.slice(0, 3).map((b) => {
          const entryLow = b.risk?.entry ? (b.risk.entry * 0.995).toFixed(1) : b.price;
          const entryHigh = b.risk?.entry ? (b.risk.entry * 1.005).toFixed(1) : (b.price * 1.01).toFixed(1);
          return {
            symbol: b.symbol,
            setupType: b.regime === "BULLISH_TREND" ? "Trend Continuation Breakout" : "Pullback Retest",
            entryZone: `₹${entryLow} - ₹${entryHigh}`,
            stopLoss: b.risk?.stopLoss ? `₹${Number(b.risk.stopLoss).toFixed(1)}` : `₹${(b.price * 0.97).toFixed(1)}`,
            target: b.risk?.target1 ? `₹${Number(b.risk.target1).toFixed(1)}` : `₹${(b.price * 1.05).toFixed(1)}`,
            rationale: b.evidence && b.evidence.length > 0
              ? `Confirmed by ${b.evidence.slice(0, 2).join(" and ")} with strength score ${b.strength}/100.`
              : `Strong technical momentum with RSI at ${b.rsi ? Number(b.rsi).toFixed(1) : "N/A"} and ADX trend strength.`,
          };
        });

  const riskWatchlist = exitCandidates.slice(0, 6).map((e) => ({
    symbol: e.symbol,
    warning: e.risks && e.risks.length > 0 ? e.risks.slice(0, 2).join("; ") : "Loss of primary moving average support; avoid fresh long entry.",
  }));

  const tacticalGameplan = marketSentiment === "BEARISH_CORRECTION"
    ? [
        "Adopt a defensive posture: preserve cash and avoid aggressive dip-buying until a higher-low pivot forms.",
        "Strictly honor stop-loss levels without hesitation on any remaining long inventory.",
        "Watch key index support zones; wait for price to reclaim the 20-day EMA before deploying fresh swing capital.",
      ]
    : [
        "Focus on high-conviction breakout setups displaying volume confirmation at market open.",
        "Strictly honor stop-loss levels and trail stops to entry once the 1R target is reached.",
        "Avoid chasing overextended stocks that have moved more than 5% away from their 20 EMA.",
      ];

  return {
    marketSentiment,
    sentimentHeadline,
    executiveSummary,
    topSwingSetups,
    riskWatchlist,
    tacticalGameplan,
  };
}

/**
 * Executes a full market scan and produces a Gemini AI market briefing.
 * @param {object} [options]
 * @param {Array<string>} [options.symbols] - Custom symbols list (defaults to DEFAULT_BRIEFING_WATCHLIST)
 * @param {string} [options.dateStr]
 * @param {object} [options.client] - Injected client for testing / mocking
 * @param {boolean} [options.allowFallback=false] - Whether to fall back to rule-based briefing on Gemini failure
 * @param {Function} [options.onProgress] - Optional callback for scan progress
 * @returns {Promise<{ aggregated: object, briefing: object, markdown: string, source: string }>}
 */
export async function generateMarketBriefing(options = {}) {
  const {
    symbols = DEFAULT_BRIEFING_WATCHLIST,
    dateStr = new Date().toISOString().slice(0, 10),
    client,
    analyzer = analyzeStock,
    allowFallback = false,
    onProgress,
  } = options;

  const scanResults = [];
  const CONCURRENCY = 4;

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const chunk = symbols.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (symbol, chunkIdx) => {
        const overallIdx = i + chunkIdx;
        if (onProgress) onProgress({ current: overallIdx + 1, total: symbols.length, symbol });
        try {
          const res = await analyzer(symbol, {
            lookbackCalendarDays: 365,
            timeframe: "1d",
          });
          return { symbol, ...res };
        } catch (err) {
          return { symbol, error: err.message, signal: null };
        }
      })
    );
    scanResults.push(...chunkResults);
  }

  const aggregated = aggregateMarketData(scanResults);
  const prompt = buildMarketBriefingPrompt(aggregated, dateStr);

  let briefing = null;
  let source = "gemini";

  try {
    const geminiRes = await generateGeminiResponse(prompt, {
      systemInstruction:
        "You are a professional SEBI-aligned technical market analyst. Provide concise, disciplined, risk-first trade analysis for Indian markets.",
      responseFormat: "json",
      temperature: 0.3,
      client,
    });

    briefing = geminiRes.data;
    if (!briefing || typeof briefing !== "object" || Array.isArray(briefing)) {
      throw new Error("Gemini returned an unexpected briefing payload shape.");
    }
  } catch (err) {
    if (allowFallback) {
      briefing = generateFallbackBriefing(aggregated, dateStr);
      source = "fallback";
    } else {
      throw err;
    }
  }

  const markdown = formatBriefingMarkdown(briefing, aggregated, dateStr);

  return {
    aggregated,
    briefing,
    markdown,
    source,
  };
}
