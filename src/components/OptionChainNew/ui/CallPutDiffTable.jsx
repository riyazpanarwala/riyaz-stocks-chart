// ═══════════════════════════════════════════════════════════════
// ATM ±5 CALL-PUT DIFFERENCE TABLE
// Displays ATM strike + 5 strikes below + 5 strikes above (11 total)
// with Call - Put difference and Bullish / Bearish / Neutral indication.
// ═══════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { C } from "../constants.js";
import { fmtK } from "../utils/formatters.js";

/**
 * Format raw difference with sign and commas.
 */
function fmtDiff(val) {
  if (val == null || !Number.isFinite(val)) return "—";
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  const abs = Math.abs(val);
  return `${sign}${abs.toLocaleString("en-IN")}`;
}

export const CallPutDiffTable = React.memo(function CallPutDiffTable({
  rows = [],
  atm = 0,
  spot = 0,
  sig = null,
  lotSize = 1,
}) {
  // Metric mode: "oi" (Open Interest) | "doi" (Change in OI) | "price" (LTP / Premium)
  const [metric, setMetric] = useState("oi");

  // Perspective: "institutional" (Writers/Smart Money) | "buyers" (Direct Buyer view)
  const [perspective, setPerspective] = useState("institutional");

  // Optional: show raw Call & Put columns alongside Call - Put difference
  const [showBreakdown, setShowBreakdown] = useState(false);

  // 1. Sort rows by strike ascending
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.strikePrice - b.strikePrice);
  }, [rows]);

  // 2. Identify ATM index
  const atmIndex = useMemo(() => {
    if (!sortedRows.length) return -1;
    const exact = sortedRows.findIndex((r) => r.strikePrice === atm);
    if (exact !== -1) return exact;
    return sortedRows.reduce(
      (best, r, idx) =>
        Math.abs(r.strikePrice - atm) < Math.abs(sortedRows[best].strikePrice - atm)
          ? idx
          : best,
      0
    );
  }, [sortedRows, atm]);

  // 3. Extract 5 strikes below ATM, ATM, and 5 strikes above ATM (11 strikes total)
  const targetStrikes = useMemo(() => {
    if (atmIndex === -1 || !sortedRows.length) return [];
    const start = Math.max(0, atmIndex - 5);
    const end = Math.min(sortedRows.length, atmIndex + 6); // 5 above + ATM + 5 below
    return sortedRows.slice(start, end).map((r, i) => {
      const offset = (start + i) - atmIndex;
      return {
        ...r,
        offset,
        isATM: r.strikePrice === atm,
      };
    });
  }, [sortedRows, atmIndex, atm]);

  // 4. Calculate Call - Put and Indication for each strike
  const strikeData = useMemo(() => {
    const valueFor = (leg) => {
      if (!leg || leg.available === false) return null;
      if (metric === "oi") return leg.openInterest;
      if (metric === "doi") return leg.changeinOpenInterest;
      return leg.lastPrice;
    };

    return targetStrikes
      .filter((r) => Number.isFinite(valueFor(r.CE)) && Number.isFinite(valueFor(r.PE)))
      .map((r) => {
        const callVal = valueFor(r.CE);
        const putVal = valueFor(r.PE);

        const diff = callVal - putVal;
        const total = Math.abs(callVal) + Math.abs(putVal);
        // Relative difference percentage to detect neutral zone (e.g. within 8%)
        const relDiff = total > 0 ? Math.abs(diff) / total : 0;
        // LTP differences reflect moneyness/intrinsic value rather than sentiment.
        const isNeutral = metric === "price" || total === 0 || relDiff < 0.08;

        let indication = "NEUTRAL";
        let indColor = C.yellow;
        let indBg = "#1c1400";
        let indBorder = `${C.yellow}40`;
        let reason = metric === "price"
          ? "Price diff reflects option moneyness (intrinsic value)"
          : "Balanced Call & Put activity";

        if (!isNeutral) {
          if (perspective === "institutional") {
            // Option Writers logic (NSE industry standard):
            // High Put OI = Support / Put Writers defend = Bullish
            // High Call OI = Resistance / Call Writers cap = Bearish
            if (diff < 0) {
              // Put > Call
              indication = "BULLISH";
              indColor = C.green;
              indBg = C.greenBg;
              indBorder = `${C.green}40`;
              reason = "Put OI > Call OI (Put writers defending support)";
            } else {
              // Call > Put
              indication = "BEARISH";
              indColor = C.red;
              indBg = C.redBg;
              indBorder = `${C.red}40`;
              reason = "Call OI > Call writers building resistance";
            }
          } else {
            // Direct Buyer logic:
            // Call > Put = Bullish
            // Put > Call = Bearish
            if (diff > 0) {
              indication = "BULLISH";
              indColor = C.green;
              indBg = C.greenBg;
              indBorder = `${C.green}40`;
              reason = "Call > Put (Higher call volume/OI)";
            } else {
              indication = "BEARISH";
              indColor = C.red;
              indBg = C.redBg;
              indBorder = `${C.red}40`;
              reason = "Put > Call (Higher put volume/OI)";
            }
          }
        }

        return {
          ...r,
          callVal,
          putVal,
          diff,
          relDiff,
          indication,
          indColor,
          indBg,
          indBorder,
          reason,
        };
      });
  }, [targetStrikes, metric, perspective]);

  // 5. Cluster Summary across the ATM ±5 window
  const clusterSummary = useMemo(() => {
    if (!strikeData.length) return null;
    let totalCall = 0;
    let totalPut = 0;

    strikeData.forEach((s) => {
      totalCall += s.callVal;
      totalPut += s.putVal;
    });

    const netDiff = totalCall - totalPut;
    const clusterPcr = metric === "oi" && totalCall > 0 ? totalPut / totalCall : null;
    const isNeutral = metric === "price" || Math.abs(netDiff) / (Math.abs(totalCall) + Math.abs(totalPut) || 1) < 0.05;

    let overallBias = "NEUTRAL";
    let biasColor = C.yellow;

    if (!isNeutral) {
      if (perspective === "institutional") {
        if (netDiff < 0) {
          overallBias = "BULLISH";
          biasColor = C.green;
        } else {
          overallBias = "BEARISH";
          biasColor = C.red;
        }
      } else {
        if (netDiff > 0) {
          overallBias = "BULLISH";
          biasColor = C.green;
        } else {
          overallBias = "BEARISH";
          biasColor = C.red;
        }
      }
    }

    return {
      totalCall,
      totalPut,
      netDiff,
      clusterPcr,
      overallBias,
      biasColor,
    };
  }, [strikeData, perspective, metric]);

  // Max diff for calculating skew bar width
  const maxAbsDiff = useMemo(() => {
    return Math.max(...strikeData.map((s) => Math.abs(s.diff)), 1);
  }, [strikeData]);

  if (!strikeData.length) {
    return (
      <div style={{ background: C.surface, borderRadius: 10, padding: 20, textAlign: "center", color: C.muted }}>
        No option chain data available for ATM ±5 calculation.
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: 14, marginBottom: 14 }}>
      {/* ── Table Header & Controls ───────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚖️ ATM ±5 Strikes Call-Put Difference</span>
            <span style={{ fontSize: 10, background: C.surface2, color: C.blue, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
              11 Strikes Window
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            Previous 5 strikes + ATM ({atm.toLocaleString("en-IN")}) + Next 5 strikes
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Metric Selector */}
          <div style={{ display: "flex", background: C.surface2, borderRadius: 6, padding: 2 }}>
            {[
              { id: "oi", label: "Total OI" },
              { id: "doi", label: "ΔOI Today" },
              { id: "price", label: "Price (LTP)" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 5,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono',monospace",
                  background: metric === m.id ? C.blue : "transparent",
                  color: metric === m.id ? "#fff" : C.muted,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Perspective Selector */}
          <button
            onClick={() => setPerspective((p) => (p === "institutional" ? "buyers" : "institutional"))}
            title={
              perspective === "institutional"
                ? "Institutional (Writers): Put OI = Support (Bullish), Call OI = Resistance (Bearish). Click to switch to Buyer view."
                : "Buyer view: Call > Put = Bullish, Put > Call = Bearish. Click to switch to Institutional Writer view."
            }
            style={{
              padding: "4px 9px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: perspective === "institutional" ? C.purple : C.yellow,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            {perspective === "institutional" ? "🏛️ Smart Money (Writers)" : "🛒 Buyer Momentum"}
          </button>

          {/* Breakdown Toggle */}
          <button
            onClick={() => setShowBreakdown((b) => !b)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: showBreakdown ? "#14253d" : "transparent",
              color: showBreakdown ? C.blue : C.muted,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            {showBreakdown ? "Hide Legs" : "Show CE/PE"}
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ───────────────────────────────── */}
      {clusterSummary && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
          marginBottom: 12,
          background: C.surface2,
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>ATM Zone Bias</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: clusterSummary.biasColor, marginTop: 2 }}>
              {clusterSummary.overallBias}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Net Call - Put</div>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: clusterSummary.netDiff > 0 ? (perspective === "institutional" ? C.red : C.green) : (perspective === "institutional" ? C.green : C.red),
              marginTop: 2,
            }}>
              {fmtDiff(clusterSummary.netDiff)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Total Call {metric.toUpperCase()}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginTop: 2 }}>
              {metric === "price" ? `₹${clusterSummary.totalCall.toFixed(1)}` : fmtK(clusterSummary.totalCall)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Total Put {metric.toUpperCase()}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginTop: 2 }}>
              {metric === "price" ? `₹${clusterSummary.totalPut.toFixed(1)}` : fmtK(clusterSummary.totalPut)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>ATM ±5 PCR</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginTop: 2 }}>
              {clusterSummary.clusterPcr != null ? clusterSummary.clusterPcr.toFixed(2) : "—"}
            </div>
          </div>
        </div>
      )}

      {/* ── 3-Column Call-Put Table ────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 10 }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, letterSpacing: 0.5 }}>
                STRIKE PRICE
              </th>
              {showBreakdown && (
                <>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: C.red }}>
                    CALL {metric.toUpperCase()}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: C.green }}>
                    PUT {metric.toUpperCase()}
                  </th>
                </>
              )}
              <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, letterSpacing: 0.5 }}>
                CALL - PUT ({metric.toUpperCase()})
              </th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, letterSpacing: 0.5 }}>
                INDICATION
              </th>
            </tr>
          </thead>
          <tbody>
            {strikeData.map((row) => {
              const barPct = Math.min(100, (Math.abs(row.diff) / maxAbsDiff) * 100);
              const isCallDominant = row.diff > 0;

              return (
                <tr
                  key={row.strikePrice}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: row.isATM
                      ? "#1c2a3a"
                      : row.offset === 0
                      ? "#142233"
                      : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Column 1: Strike Price */}
                  <td style={{ padding: "7px 10px", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontWeight: row.isATM ? 800 : 600,
                          color: row.isATM ? C.blue : C.text,
                          fontSize: 12,
                        }}
                      >
                        ₹{row.strikePrice.toLocaleString("en-IN")}
                      </span>

                      {row.isATM ? (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: "#123b63",
                          color: "#79c0ff",
                          border: "1px solid #388bfd66",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}>
                          ATM ◆
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 9,
                          color: C.muted,
                          background: C.surface2,
                          padding: "1px 5px",
                          borderRadius: 4,
                        }}>
                          {row.offset > 0 ? `ATM +${row.offset}` : `ATM ${row.offset}`}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Optional Breakdown Columns */}
                  {showBreakdown && (
                    <>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: C.red, fontWeight: 600 }}>
                        {metric === "price" ? `₹${row.callVal.toFixed(2)}` : row.callVal.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: C.green, fontWeight: 600 }}>
                        {metric === "price" ? `₹${row.putVal.toFixed(2)}` : row.putVal.toLocaleString("en-IN")}
                      </td>
                    </>
                  )}

                  {/* Column 2: Call - Put Difference */}
                  <td style={{ padding: "7px 10px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: row.diff === 0
                              ? C.muted
                              : row.diff > 0
                              ? C.red
                              : C.green,
                          }}
                        >
                          {fmtDiff(row.diff)}
                        </span>
                        {metric !== "price" && Math.abs(row.diff) >= 1000 && (
                          <span style={{ fontSize: 9, color: C.muted }}>
                            ({fmtK(row.diff)})
                          </span>
                        )}
                      </div>

                      {/* Visual Skew Meter */}
                      <div
                        style={{
                          width: 100,
                          height: 4,
                          background: C.surface2,
                          borderRadius: 2,
                          marginTop: 4,
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${barPct}%`,
                            background: isCallDominant ? C.red : C.green,
                            marginLeft: isCallDominant ? "auto" : "0",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Column 3: Indication (Bullish / Bearish / Neutral) */}
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          background: row.indBg,
                          color: row.indColor,
                          border: `1px solid ${row.indBorder}`,
                        }}
                      >
                        {row.indication === "BULLISH" && "🟢 "}
                        {row.indication === "BEARISH" && "🔴 "}
                        {row.indication === "NEUTRAL" && "🟡 "}
                        {row.indication}
                      </span>
                      <span style={{ fontSize: 8.5, color: C.muted, marginTop: 2, textAlign: "right" }}>
                        {row.reason}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer Notes ─────────────────────────────── */}
      <div style={{ marginTop: 10, fontSize: 9, color: C.muted, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div>
          📌 <b>Methodology:</b> In Indian F&O (Institutions/Writers perspective), Put OI represents price floor/support, while Call OI represents price ceiling/resistance.
          When Put &gt; Call (difference &lt; 0), it indicates bullish support. Switch to &apos;Buyer Momentum&apos; if you prefer direct buyer tracking.
        </div>
        <div style={{ color: C.blue }}>
          ATM: ₹{atm.toLocaleString("en-IN")} {spot > 0 ? `| Spot: ₹${spot.toLocaleString("en-IN")}` : ""}
        </div>
      </div>
    </div>
  );
});
