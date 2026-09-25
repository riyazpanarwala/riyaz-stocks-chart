// ═══════════════════════════════════════════════════════════════
// STRIKE TABLE & OPTION GREEKS VIEW
// Displays both Open Interest View and Black-Scholes Greeks View
// (Delta, Gamma, Vega, and Rupee Theta Decay per lot).
// ═══════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { C } from "../constants.js";
import { buildupType }  from "../utils/parsers.js";
import { calcRowGreeks } from "../utils/greeksEngine.js";

/**
 * Determine the side-aware buildup classification for a strike row.
 * - Strikes above ATM: analyze CE (calls/resistance/breakout)
 * - Strikes below ATM: analyze PE (puts/support/breakdown)
 * - At ATM: pick the leg with dominant change in open interest
 */
function getStrikeBuildup(row, atm) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;

  const side = isATM
    ? Math.abs(PE.changeinOpenInterest || 0) > Math.abs(CE.changeinOpenInterest || 0)
      ? "PE"
      : "CE"
    : sp > atm
      ? "CE"
      : "PE";

  const buType = buildupType(row, side);

  if (buType === "No Change") {
    return { label: "No activity", color: C.muted };
  }

  if (side === "CE") {
    switch (buType) {
      case "Long Build-up":
        return { label: "CE Long Build-up (Bullish)", color: C.green };
      case "Short Build-up":
        return { label: "CE Call Writing (Resistance)", color: C.red };
      case "Short Covering":
        return { label: "CE Short Covering (Squeeze)", color: C.blue };
      case "Long Unwinding":
        return { label: "CE Long Unwinding", color: C.muted };
      default:
        return { label: buType, color: C.muted };
    }
  } else {
    // PE side
    switch (buType) {
      case "Long Build-up":
        return { label: "PE Put Buying (Bearish)", color: C.red };
      case "Short Build-up":
        return { label: "PE Put Writing (Support)", color: C.green };
      case "Short Covering":
        return { label: "PE Short Covering", color: C.blue };
      case "Long Unwinding":
        return { label: "PE Put Unwinding (Exit)", color: C.muted };
      default:
        return { label: buType, color: C.muted };
    }
  }
}

const OI_HEADERS = ["Call OI", "Call ΔOI", "Call Price", "STRIKE", "Put OI", "Put ΔOI", "Put Price", "What's Happening"];
const GREEKS_HEADERS = ["Call IV", "Call Delta (Δ)", "Call Theta (₹/lot)", "STRIKE", "Put Theta (₹/lot)", "Put Delta (Δ)", "Put IV", "Gamma / Vega"];

const StrikeRowOI = React.memo(function StrikeRowOI({ row, atm, sig }) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;
  const isSup = sig?.topSupport?.includes(sp)    ?? false;
  const isRes = sig?.topResistance?.includes(sp) ?? false;
  const { label: buLabel, color: buColor } = getStrikeBuildup(row, atm);

  return (
    <tr style={{
      borderBottom: `1px solid ${C.surface2}`,
      background: isATM ? "#161e2e" : isRes ? C.redBg : isSup ? C.greenBg : "transparent",
    }}>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.red }}>{CE.openInterest.toLocaleString()}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: CE.changeinOpenInterest >= 0 ? C.red : C.green }}>
        {CE.changeinOpenInterest > 0 ? "+" : ""}{CE.changeinOpenInterest.toLocaleString()}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.text }}>₹{CE.lastPrice}</td>
      <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700,
        color:      isATM ? C.blue : isRes ? C.red : isSup ? C.green : C.text,
        background: isATM ? "#1c2a3a" : undefined,
      }}>
        {sp}{isATM ? " ◆" : ""}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.green }}>{PE.openInterest.toLocaleString()}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: PE.changeinOpenInterest >= 0 ? C.green : C.red }}>
        {PE.changeinOpenInterest > 0 ? "+" : ""}{PE.changeinOpenInterest.toLocaleString()}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.text }}>₹{PE.lastPrice}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: buColor, whiteSpace: "nowrap", fontSize: 10 }}>
        {buLabel}
      </td>
    </tr>
  );
});

const StrikeRowGreeks = React.memo(function StrikeRowGreeks({ row, atm, spot, tYears, lotSize }) {
  const { strikePrice: sp } = row;
  const isATM = sp === atm;
  const greeks = calcRowGreeks(row, spot, tYears, lotSize);
  const { CE: ceG, PE: peG } = greeks;

  return (
    <tr style={{
      borderBottom: `1px solid ${C.surface2}`,
      background: isATM ? "#161e2e" : "transparent",
    }}>
      {/* Call Greeks */}
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.muted }}>{ceG.iv}%</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.green, fontWeight: 600 }}>+{ceG.delta}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.red }}>
        -₹{ceG.thetaDailyLot} <span style={{ fontSize: 9, color: C.muted }}>({ceG.thetaDaily})</span>
      </td>

      {/* Strike Center */}
      <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700,
        color: isATM ? C.blue : C.text,
        background: isATM ? "#1c2a3a" : undefined,
      }}>
        {sp}{isATM ? " ◆" : ""}
      </td>

      {/* Put Greeks */}
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.red }}>
        -₹{peG.thetaDailyLot} <span style={{ fontSize: 9, color: C.muted }}>({peG.thetaDaily})</span>
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.red, fontWeight: 600 }}>{peG.delta}</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.muted }}>{peG.iv}%</td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.yellow, fontSize: 10 }}>
        Γ:{ceG.gamma} | ν:{ceG.vega}
      </td>
    </tr>
  );
});

export const StrikeTable = React.memo(function StrikeTable({
  displayRows,
  atm,
  sig,
  spot = 0,
  tYears = 0.019,
  lotSize = 1,
}) {
  const [viewMode, setViewMode] = useState("oi"); // "oi" | "greeks"

  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: 12, marginBottom: 12 }}>
      {/* Table Toolbar / View Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setViewMode("oi")}
            style={{
              padding: "4px 10px",
              borderRadius: 5,
              border: `1px solid ${viewMode === "oi" ? C.blue : C.border}`,
              background: viewMode === "oi" ? "#14253d" : "transparent",
              color: viewMode === "oi" ? C.blue : C.muted,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            📊 Open Interest View
          </button>
          <button
            onClick={() => setViewMode("greeks")}
            style={{
              padding: "4px 10px",
              borderRadius: 5,
              border: `1px solid ${viewMode === "greeks" ? C.purple : C.border}`,
              background: viewMode === "greeks" ? "#26133a" : "transparent",
              color: viewMode === "greeks" ? C.purple : C.muted,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            🧮 Option Greeks View
          </button>
        </div>

        <div style={{ fontSize: 10, color: C.muted }}>
          {viewMode === "oi" ? (
            <span>Showing live OI, net changes, and side-aware buildup</span>
          ) : (
            <span>Delta (Δ) = ITM Prob | Theta (Θ) = Daily decay in ₹/lot (lot size: {lotSize})</span>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 650 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {(viewMode === "oi" ? OI_HEADERS : GREEKS_HEADERS).map((h) => (
                <th key={h} style={{ padding: "6px 6px", color: C.muted, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r) =>
              viewMode === "oi" ? (
                <StrikeRowOI key={r.strikePrice} row={r} atm={atm} sig={sig} />
              ) : (
                <StrikeRowGreeks
                  key={r.strikePrice}
                  row={r}
                  atm={atm}
                  spot={spot}
                  tYears={tYears}
                  lotSize={lotSize}
                />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
