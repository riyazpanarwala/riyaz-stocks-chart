// ═══════════════════════════════════════════════════════════════
// STRIKE TABLE & OPTION GREEKS VIEW
// Displays Open Interest View (Today vs 15m Velocity ΔOI),
// Black-Scholes Greeks View (Delta, Gamma, Vega, Theta),
// and ATM ±5 Diff View.
// ═══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { C } from "../constants.js";
import { buildupType }  from "../utils/parsers.js";
import { calcRowGreeks } from "../utils/greeksEngine.js";
import { CallPutDiffTable } from "./CallPutDiffTable.jsx";

/**
 * Determine the side-aware buildup classification for a strike row.
 * - Strikes above ATM: analyze CE (calls/resistance/breakout)
 * - Strikes below ATM: analyze PE (puts/support/breakdown)
 * - At ATM: pick the leg with dominant change in open interest
 */
function getStrikeBuildup(row, atm, oi15m = null) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;

  const side = isATM
    ? Math.abs(PE.changeinOpenInterest || 0) > Math.abs(CE.changeinOpenInterest || 0)
      ? "PE"
      : "CE"
    : sp > atm
      ? "CE"
      : "PE";

  // If 15m delta is active, detect fast short covering in last 15m
  if (oi15m) {
    const ce15 = oi15m.ce;
    const pe15 = oi15m.pe;
    if (side === "CE" && ce15 != null && ce15 < 0) {
      return { label: `⚡ 15m Short Covering (${ce15.toLocaleString()})`, color: C.blue };
    }
    if (side === "PE" && pe15 != null && pe15 < 0) {
      return { label: `⚡ 15m Put Unwinding (${pe15.toLocaleString()})`, color: C.red };
    }
  }

  const buType = buildupType(row, side);

  if (buType === "No Change") {
    return { label: "No activity", color: C.muted };
  }

  if (side === "CE") {
    switch (buType) {
      case "Long Build-up":
        return { label: "Inferred Call Long Buildup", color: C.green };
      case "Short Build-up":
        return { label: "Inferred Call Short Buildup", color: C.red };
      case "Short Covering":
        return { label: "Inferred Call Short Covering", color: C.blue };
      case "Long Unwinding":
        return { label: "Inferred Call Long Unwinding", color: C.muted };
      default:
        return { label: buType, color: C.muted };
    }
  } else {
    // PE side
    switch (buType) {
      case "Long Build-up":
        return { label: "Inferred Put Long Buildup", color: C.red };
      case "Short Build-up":
        return { label: "Inferred Put Short Buildup", color: C.green };
      case "Short Covering":
        return { label: "Inferred Put Short Covering", color: C.blue };
      case "Long Unwinding":
        return { label: "Inferred Put Long Unwinding", color: C.muted };
      default:
        return { label: buType, color: C.muted };
    }
  }
}

const StrikeRowOI = React.memo(function StrikeRowOI({ row, atm, sig, oiInterval = "today", delta15m = null }) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;
  const isSup = sig?.topSupport?.includes(sp)    ?? false;
  const isRes = sig?.topResistance?.includes(sp) ?? false;
  const { label: buLabel, color: buColor } = getStrikeBuildup(row, atm, oiInterval === "15m" ? delta15m : null);

  // In 15m mode, only use 15m delta; do not fall back to today's change (Comment 8)
  const ceDelta = oiInterval === "15m" ? (delta15m?.ce ?? null) : CE.changeinOpenInterest;
  const peDelta = oiInterval === "15m" ? (delta15m?.pe ?? null) : PE.changeinOpenInterest;

  return (
    <tr style={{
      borderBottom: `1px solid ${C.surface2}`,
      background: isATM ? "#161e2e" : isRes ? C.redBg : isSup ? C.greenBg : "transparent",
    }}>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.red }}>{CE.openInterest?.toLocaleString() ?? "—"}</td>
      <td style={{
        padding: "4px 6px", textAlign: "right",
        color: ceDelta == null ? C.muted : ceDelta >= 0 ? C.red : C.green,
        fontWeight: oiInterval === "15m" ? 700 : 400,
      }}>
        {ceDelta == null ? "—" : `${ceDelta > 0 ? "+" : ""}${ceDelta.toLocaleString()}`}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.text }}>₹{CE.lastPrice}</td>
      <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700,
        color:      isATM ? C.blue : isRes ? C.red : isSup ? C.green : C.text,
        background: isATM ? "#1c2a3a" : undefined,
      }}>
        {sp}{isATM ? " ◆" : ""}
      </td>
      <td style={{ padding: "4px 6px", textAlign: "right", color: C.green }}>{PE.openInterest?.toLocaleString() ?? "—"}</td>
      <td style={{
        padding: "4px 6px", textAlign: "right",
        color: peDelta == null ? C.muted : peDelta >= 0 ? C.green : C.red,
        fontWeight: oiInterval === "15m" ? 700 : 400,
      }}>
        {peDelta == null ? "—" : `${peDelta > 0 ? "+" : ""}${peDelta.toLocaleString()}`}
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
  rows = [],
  atm,
  sig,
  spot = 0,
  tYears = 0.019,
  lotSize = 1,
  snapshots = [],
  now = Date.now(),
}) {
  const [viewMode, setViewMode] = useState("oi"); // "oi" | "greeks" | "diff"
  const [oiInterval, setOiInterval] = useState("today"); // "today" | "15m"

  // Compute 15-minute delta map from snapshots nearest 15 minutes (bounded 10m - 20m) (Comment 9)
  const delta15mMap = useMemo(() => {
    if (!snapshots?.length) return new Map();
    const TARGET_MS = 15 * 60_000;
    // Strictly bound eligible snapshots to [10 mins, 20 mins] age
    const eligible = snapshots.filter(
      (s) => s.ts && now - s.ts >= 600_000 && now - s.ts <= 1_200_000
    );
    if (!eligible.length) return new Map();

    // Select snapshot closest to now - 15m (TARGET_MS)
    const snap15 = eligible.reduce((closest, s) => {
      const diffCurrent = Math.abs(now - s.ts - TARGET_MS);
      const diffClosest = Math.abs(now - closest.ts - TARGET_MS);
      return diffCurrent < diffClosest ? s : closest;
    }, eligible[0]);

    if (!snap15?.rows?.length) return new Map();

    const map = new Map();
    for (const cur of rows) {
      const past = snap15.rows.find((r) => r.strikePrice === cur.strikePrice);
      if (past) {
        const ceDelta = cur.CE?.openInterest != null && past.CE?.openInterest != null
          ? cur.CE.openInterest - past.CE.openInterest : null;
        const peDelta = cur.PE?.openInterest != null && past.PE?.openInterest != null
          ? cur.PE.openInterest - past.PE.openInterest : null;
        map.set(cur.strikePrice, { ce: ceDelta, pe: peDelta });
      }
    }
    return map;
  }, [snapshots, rows, now]);

  const oiHeaders = useMemo(() => [
    "Call OI (Bets)",
    oiInterval === "15m" ? "⚡ Call 15m ΔOI" : "Call ΔOI (Today)",
    "Call Price",
    "STRIKE",
    "Put OI (Bets)",
    oiInterval === "15m" ? "⚡ Put 15m ΔOI" : "Put ΔOI (Today)",
    "Put Price",
    "What's Happening",
  ], [oiInterval]);

  const greeksHeaders = [
    "Call IV", "Call Delta (Δ)", "Call Theta (₹/lot)", "STRIKE",
    "Put Theta (₹/lot)", "Put Delta (Δ)", "Put IV", "Gamma / Vega",
  ];

  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: 12, marginBottom: 12 }}>
      {/* Table Toolbar / View Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setViewMode("oi")}
            style={{
              padding: "4px 10px", borderRadius: 5,
              border: `1px solid ${viewMode === "oi" ? C.blue : C.border}`,
              background: viewMode === "oi" ? "#14253d" : "transparent",
              color: viewMode === "oi" ? C.blue : C.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            📊 Open Interest View
          </button>
          <button
            onClick={() => setViewMode("greeks")}
            style={{
              padding: "4px 10px", borderRadius: 5,
              border: `1px solid ${viewMode === "greeks" ? C.purple : C.border}`,
              background: viewMode === "greeks" ? "#26133a" : "transparent",
              color: viewMode === "greeks" ? C.purple : C.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            🧮 Option Greeks View
          </button>
          <button
            onClick={() => setViewMode("diff")}
            style={{
              padding: "4px 10px", borderRadius: 5,
              border: `1px solid ${viewMode === "diff" ? C.yellow : C.border}`,
              background: viewMode === "diff" ? "#2d2200" : "transparent",
              color: viewMode === "diff" ? C.yellow : C.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            ⚖️ ATM ±5 Diff View
          </button>

          {/* Sub-toggle for Point 3: Today vs 15m Velocity ΔOI */}
          {viewMode === "oi" && (
            <div style={{
              display: "inline-flex", gap: 2, background: C.surface2,
              padding: 2, borderRadius: 5, border: `1px solid ${C.border}`, marginLeft: 6,
            }}>
              <button
                onClick={() => setOiInterval("today")}
                style={{
                  padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer",
                  fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace",
                  background: oiInterval === "today" ? C.surface : "transparent",
                  color: oiInterval === "today" ? C.text : C.muted,
                }}
              >
                Today ΔOI
              </button>
              <button
                onClick={() => setOiInterval("15m")}
                title="Shows change in Open Interest over the last 15 minutes to reveal active short covering / unwinding"
                style={{
                  padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer",
                  fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace",
                  background: oiInterval === "15m" ? "#1e2e1a" : "transparent",
                  color: oiInterval === "15m" ? C.green : C.muted,
                }}
              >
                ⚡ 15m Velocity
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, color: C.muted }}>
          {viewMode === "oi" ? (
            oiInterval === "15m" ? (
              <span style={{ color: C.green }}>⚡ 15m Velocity active: Negative Call ΔOI = Short Covering (Bullish) | Negative Put ΔOI = Long Unwinding (Bearish)</span>
            ) : (
              <span>Showing active contracts, today&apos;s position changes, and plain English market action</span>
            )
          ) : viewMode === "greeks" ? (
            <span>Delta (Δ) = Price Sensitivity | Theta (Θ) = Time decay lost per day in ₹/lot (lot size: {lotSize})</span>
          ) : (
            <span>ATM strike + 5 strikes below + 5 strikes above Call vs Put difference table</span>
          )}
        </div>
      </div>

      {viewMode === "diff" ? (
        <CallPutDiffTable
          rows={rows.length ? rows : displayRows}
          atm={atm}
          spot={spot}
          sig={sig}
          lotSize={lotSize}
        />
      ) : (
        /* Table Container */
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 650 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {(viewMode === "oi" ? oiHeaders : greeksHeaders).map((h) => (
                  <th key={h} style={{ padding: "6px 6px", color: C.muted, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) =>
                viewMode === "oi" ? (
                  <StrikeRowOI
                    key={r.strikePrice}
                    row={r}
                    atm={atm}
                    sig={sig}
                    oiInterval={oiInterval}
                    delta15m={delta15mMap.get(r.strikePrice)}
                  />
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
      )}
    </div>
  );
});
