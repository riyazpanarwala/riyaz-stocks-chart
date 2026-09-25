// ═══════════════════════════════════════════════════════════════
// ATM STRADDLE & EXPECTED MOVE BANNER
// Displays combined ATM Straddle price, implied expiry range,
// daily theta burn, and volatility regime.
// ═══════════════════════════════════════════════════════════════
import React from "react";
import { C } from "../constants.js";

export const StraddleBanner = React.memo(function StraddleBanner({ straddleInfo, lotSize = 1 }) {
  if (!straddleInfo) return null;

  const {
    atm,
    spot,
    ceLtp,
    peLtp,
    straddlePremium,
    straddleChange,
    straddleChangePct,
    expectedUpper,
    expectedLower,
    expectedMovePts,
    expectedMovePct,
    combinedThetaLot,
    regime,
  } = straddleInfo;

  const chgColor = straddleChange > 0 ? C.yellow : straddleChange < 0 ? C.green : C.muted;
  const chgSign = straddleChange > 0 ? "+" : "";

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {/* Left: Straddle Core & Regime */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ATM Straddle (Strike {atm})
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
              ₹{straddlePremium.toFixed(1)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: chgColor }}>
              {chgSign}{straddleChange.toFixed(1)} ({chgSign}{straddleChangePct}%)
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>
            CE: ₹{ceLtp} + PE: ₹{peLtp}
          </div>
        </div>

        <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Volatility Regime
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: regime.color,
                background: `${regime.color}20`,
                border: `1px solid ${regime.color}40`,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {regime.label}
            </span>
          </div>
          <div style={{ fontSize: 9, color: C.muted, maxWidth: 260, marginTop: 2 }}>
            {regime.desc}
          </div>
        </div>
      </div>

      {/* Right: Expected Move Band & Theta Burn */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Expected Move
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.blue }}>
            ±{expectedMovePts} pts
          </div>
          <div style={{ fontSize: 9, color: C.muted }}>±{expectedMovePct}% of spot</div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Implied Expiry Band
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.yellow }}>
            ₹{expectedLower.toLocaleString("en-IN")} – ₹{expectedUpper.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 9, color: C.muted }}>1-Sigma Break-even</div>
        </div>

        {combinedThetaLot > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Daily Theta Burn
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>
              -₹{combinedThetaLot.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 9, color: C.muted }}>per lot ({lotSize})</div>
          </div>
        )}
      </div>
    </div>
  );
});
