// ═══════════════════════════════════════════════════════════════
// INTRADAY OPTION BUYER ACTION CARD (COCKPIT)
// Provides instant, 1-click executable strike, spot invalidation,
// target levels, and 40-minute time-stop guidance for option buyers.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { C } from "../constants.js";
import { strikePitch } from "../utils/parsers.js";
import { liquidQuote } from "../utils/tradeRules.js";

export const BreakoutActionCard = React.memo(function BreakoutActionCard({
  breakoutSignals = [],
  rows = [],
  spot = 0,
  atm = 0,
  activeExpiry = null,
  sig = null,
  lotSize = 65,
  instrument = { symbol: "NIFTY", type: "index" },
}) {
  const [copied, setCopied] = useState(false);

  // Find the highest strength active breakout signal
  const activeBreakout = breakoutSignals.find(
    (s) => (s.strength ?? 0) >= 65 && ["BULLISH_BREAKOUT", "BEARISH_BREAKDOWN", "BULLISH_MOMENTUM", "BEARISH_MOMENTUM"].includes(s.type)
  ) || breakoutSignals[0];

  const pitch = strikePitch(rows, spot) || (instrument.type === "index" ? 50 : 10);
  const isBull = activeBreakout
    ? activeBreakout.type.includes("BULLISH")
    : sig?.rawSignal === "BUY CALL";
  const isBear = activeBreakout
    ? activeBreakout.type.includes("BEARISH")
    : sig?.rawSignal === "BUY PUT";

  const hasAction = (isBull || isBear) && (activeBreakout?.strength >= 65 || (sig?.strength ?? 0) >= 65);

  // Select ITM Strike (1 to 2 strikes ITM for delta ~0.70 - 0.80)
  const itmOffset = 2 * pitch;
  const recommendedStrike = isBull
    ? (activeBreakout?.strike ? activeBreakout.strike - pitch : atm - itmOffset)
    : (activeBreakout?.strike ? activeBreakout.strike + pitch : atm + itmOffset);

  const side = isBull ? "CE" : "PE";
  const row = rows.find((r) => r.strikePrice === recommendedStrike) || rows.find((r) => r.strikePrice === atm);
  const leg = row?.[side];
  const quote = liquidQuote(leg);
  const ltp = leg?.lastPrice ?? 0;

  // Spot Risk & Target Plan
  const spotRisk = Math.round(pitch * 0.45); // ~20-25 pts on Nifty
  const spotStop = isBull ? Math.round(spot - spotRisk) : Math.round(spot + spotRisk);
  const spotTgt1 = isBull ? Math.round(spot + spotRisk * 1.5) : Math.round(spot - spotRisk * 1.5);
  const spotTgt2 = isBull ? Math.round(spot + spotRisk * 2.2) : Math.round(spot - spotRisk * 2.2);

  // Option Points estimate (approx delta 0.75)
  const estDelta = 0.75;
  const optStop = Math.max(1, Math.round(ltp - spotRisk * estDelta));
  const optTgt1 = Math.round(ltp + (spotRisk * 1.5) * estDelta);
  const optTgt2 = Math.round(ltp + (spotRisk * 2.2) * estDelta);

  const copyOrder = () => {
    const text = `${instrument.symbol} ${recommendedStrike} ${side} (${activeExpiry ?? "Near"})\n` +
      `Action: BUY @ ₹${ltp || quote.ask} (Spread: ${quote.spreadPct <= 10 ? quote.spreadPct.toFixed(1) + "%" : "wide"})\n` +
      `Spot SL: ${spotStop} (-${spotRisk} pts) | Option SL: ₹${optStop}\n` +
      `Spot TGT: ${spotTgt1} / ${spotTgt2} (+${Math.round(spotRisk * 1.5)} pts) | Option TGT: ₹${optTgt1}\n` +
      `Max Holding Time: 40 Minutes (Exit if stalled)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!hasAction) {
    return (
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <div>
            <span style={{ color: C.text, fontWeight: 600 }}>Buyer Cockpit:</span>{" "}
            <span style={{ color: C.muted }}>Monitoring for 30m coil breakout + short-covering unwinding</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, color: C.muted, fontSize: 10 }}>
          <span>Call Trigger: <b style={{ color: C.green }}>&gt; {sig?.topResistance?.[0] ?? (atm + pitch)}</b></span>
          <span>Put Trigger: <b style={{ color: C.red }}>&lt; {sig?.topSupport?.[0] ?? (atm - pitch)}</b></span>
        </div>
      </div>
    );
  }

  const badgeColor = isBull ? C.green : C.red;
  const badgeBg = isBull ? C.greenBg : C.redBg;

  return (
    <div style={{
      background: badgeBg, border: `1px solid ${badgeColor}66`, borderRadius: 10,
      padding: "12px 16px", marginBottom: 12, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{isBull ? "🚀" : "📉"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: badgeColor, letterSpacing: 0.5 }}>
            {isBull ? "HIGH-CONVICTION BUY CALL" : "HIGH-CONVICTION BUY PUT"}
          </span>
          <span style={{
            fontSize: 10, background: C.surface, color: badgeColor,
            border: `1px solid ${badgeColor}40`, padding: "2px 7px", borderRadius: 4, fontWeight: 700,
          }}>
            {activeBreakout?.strength ?? sig?.strength}% Strength
          </span>
        </div>

        <button
          onClick={copyOrder}
          style={{
            padding: "5px 12px", borderRadius: 6, cursor: "pointer",
            border: `1px solid ${badgeColor}`, background: badgeColor, color: "#fff",
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}
        >
          {copied ? "✔ Copied to Clipboard!" : "📋 Copy Order Details"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.text, marginBottom: 10 }}>
        <b>Trigger:</b> {activeBreakout?.title ?? sig?.reason} · {activeBreakout?.detail ?? ""}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 8, background: `${C.surface}bb`, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 9, color: C.muted }}>RECOMMENDED STRIKE</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
            {recommendedStrike} {side}
          </div>
          <div style={{ fontSize: 9, color: C.blue }}>ITM (Delta ~{estDelta})</div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: C.muted }}>LIVE OPTION PRICE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            ₹{ltp > 0 ? ltp.toFixed(1) : quote.ask?.toFixed(1) ?? "—"}
          </div>
          <div style={{ fontSize: 9, color: quote.spreadPct <= 3 ? C.green : C.yellow }}>
            Spread: {quote.spreadPct <= 10 ? quote.spreadPct.toFixed(1) + "%" : "wide"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: C.muted }}>SPOT INVALIDATION STOP</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>
            {spotStop}
          </div>
          <div style={{ fontSize: 9, color: C.red }}>Option SL: ~₹{optStop}</div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: C.muted }}>SPOT TARGET (1.5R / 2.2R)</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
            {spotTgt1} / {spotTgt2}
          </div>
          <div style={{ fontSize: 9, color: C.green }}>Option TGT: ~₹{optTgt1}</div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: C.muted }}>MAX HOLDING TIME</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.yellow }}>
            ⏱️ 40 Mins
          </div>
          <div style={{ fontSize: 9, color: C.muted }}>Exit if stalled &lt;1R by 35m</div>
        </div>
      </div>
    </div>
  );
});
