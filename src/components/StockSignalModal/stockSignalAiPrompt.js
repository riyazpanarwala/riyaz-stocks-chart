/**
 * stockSignalAiPrompt.js
 * Pure utility functions for building Gemini AI prompt and resolving AI verdict themes.
 */

/**
 * Builds a structured, high-context prompt for Gemini based on current algorithmic signal data.
 * @param {object} params
 * @param {object} [params.companyObj] - Metadata of the company (symbol, label, name, isin).
 * @param {object} [params.instrument] - Instrument metadata (exchange, isin).
 * @param {object} [params.signal] - Engine signal object (action, regime, scores, indicators, risk, evidence).
 * @param {object} [params.performance] - Signal lifecycle tracker (candlesElapsed, price movement, status).
 * @returns {string} Fully synthesized prompt for Gemini.
 */
export function buildSignalAiPrompt({
  companyObj = {},
  instrument = {},
  signal = {},
  performance = null,
} = {}) {
  const symbol = companyObj?.symbol || companyObj?.value || "N/A";
  const companyName = companyObj?.label || companyObj?.name || symbol;
  const exchange = instrument?.exchange || "NSE";
  const price = signal?.price != null ? Number(signal.price).toFixed(2) : "N/A";
  const currentAction = signal?.action || signal?.signal || "NO_TRADE";
  const regime = signal?.marketRegime || "UNKNOWN";
  const strength = signal?.signalStrength ?? "N/A";
  const bullishScore = signal?.bullishScore ?? 0;
  const bearishScore = signal?.bearishScore ?? 0;

  const indicators = signal?.indicators || {};
  const rsi = indicators.rsi != null ? Number(indicators.rsi).toFixed(2) : "N/A";
  const adx = indicators.adx != null ? Number(indicators.adx).toFixed(2) : "N/A";
  const volSpike = indicators.volumeRatio != null ? `${Number(indicators.volumeRatio).toFixed(2)}x` : "N/A";
  const atr = indicators.atr != null ? Number(indicators.atr).toFixed(2) : "N/A";

  const risk = signal?.risk || {};
  const entry = risk.entry != null ? Number(risk.entry).toFixed(2) : "N/A";
  const stopLoss = risk.stopLoss != null ? Number(risk.stopLoss).toFixed(2) : "N/A";
  const target1 = risk.target1 != null ? Number(risk.target1).toFixed(2) : "N/A";
  const target2 = risk.target2 != null ? Number(risk.target2).toFixed(2) : "N/A";

  const bullishFactors = signal?.evidence?.bullish || [];
  const bearishFactors = signal?.evidence?.bearish || [];
  const freshEntryBlocked = signal?.freshEntryBlocked;

  let performanceContext = "No prior trigger tracking available.";
  if (performance?.found) {
    performanceContext = `Signal triggered ${performance.candlesElapsed} candles ago at ₹${Number(performance.signalPrice).toFixed(2)}. ` +
      `Current price change: ${performance.percentChange >= 0 ? "+" : ""}${Number(performance.percentChange).toFixed(2)}%. ` +
      `Peak high reached: ₹${Number(performance.highestPriceSince).toFixed(2)} (+${Number(performance.maxGainPercent || 0).toFixed(2)}%). ` +
      `Lowest dip reached: ₹${Number(performance.lowestPriceSince).toFixed(2)} (${Number(performance.maxDrawdownPercent || 0).toFixed(2)}%). ` +
      `Status: ${performance.statusLabel || performance.status}.`;
  }

  return `You are a senior quantitative technical analyst evaluating Indian stock market equities (NSE/BSE).
Evaluate the algorithmic trade setup for ${companyName} (${symbol} on ${exchange}).

Market Context:
- Current Price: ₹${price}
- Engine Signal: ${currentAction} (Action: ${signal?.action}, Signal: ${signal?.signal})
- Market Regime: ${regime}
- Signal Strength: ${strength}/100 (Bullish Score: ${bullishScore}/100, Bearish Score: ${bearishScore}/100)
- Fresh Entry Blocked: ${freshEntryBlocked ? "YES (Rally Matured/Overextended)" : "NO"}

Technical Indicators:
- RSI (14): ${rsi}
- ADX (14 Trend Strength): ${adx}
- Volume Spike vs Average: ${volSpike}
- Average True Range (ATR): ₹${atr}

Risk & Levels (ATR-based):
- Calculated Entry: ₹${entry}
- Stop Loss: ₹${stopLoss}
- Target 1 (1.5R): ₹${target1}
- Target 2 (3.0R): ₹${target2}

Signal History & Movement:
${performanceContext}

Algorithmic Bullish Factors:
${bullishFactors.length > 0 ? bullishFactors.map((f) => `- ${f}`).join("\n") : "- None"}

Algorithmic Bearish Factors & Risks:
${bearishFactors.length > 0 ? bearishFactors.map((f) => `- ${f}`).join("\n") : "- None"}

Please provide a sharp, objective second opinion.
Respond strictly in valid JSON with these exact keys:
{
  "verdict": "CONFIRMED_BULLISH" | "CONFIRMED_EXIT" | "PROCEED_WITH_CAUTION" | "NEUTRAL_WAIT" | "HIGH_RISK",
  "verdictBadge": "2 to 4 words punchy label (e.g. High Conviction Long, Overextended Rally, Choppy Consolidation)",
  "thesis": "2 to 3 sentences explaining the technical dynamic and why this setup is or isn't attractive.",
  "keyStrengths": ["Concise strength 1", "Concise strength 2"],
  "keyRisks": ["Concise risk 1", "Concise risk 2"],
  "tacticalAdvice": "1 to 2 sentences of concrete actionable advice regarding entry timing, trailing stop, or risk management."
}`;
}

/**
 * Maps a verdict string to a theme class name.
 * @param {string} verdict
 * @returns {string} Theme class name
 */
export function getVerdictTheme(verdict) {
  switch (verdict) {
    case "CONFIRMED_BULLISH":
      return "theme-bullish";
    case "CONFIRMED_EXIT":
    case "HIGH_RISK":
      return "theme-bearish";
    case "PROCEED_WITH_CAUTION":
      return "theme-caution";
    default:
      return "theme-neutral";
  }
}
