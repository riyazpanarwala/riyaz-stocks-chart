// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// Thin orchestrator — all logic lives in hooks & utilities.
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import { C } from "./constants.js";
import FO_LIST from "./FOlist.js";
import { pcrLabel } from "./utils/formatters.js";

// ── Hooks ─────────────────────────────────────────────────────
import { useOptionChain }    from "./hooks/useOptionChain.js";
import { useChainDerived }   from "./hooks/useChainDerived.js";
import { useSnapshotHistory } from "./hooks/useSnapshotHistory.js";

// ── UI components ─────────────────────────────────────────────
import { SymbolPicker }       from "./ui/SymbolPicker.jsx";
import { SignalBanner, ZoneBadges, RefreshCountdown, LoadingSkeleton, ErrorPanel } from "./ui/StatusComponents.jsx";
import { OIChart, DeltaOIChart } from "./ui/Charts.jsx";
import { StrikeTable }        from "./ui/StrikeTable.jsx";
import { InstitutionalPanel } from "./ui/InstitutionalPanel.jsx";
import { BreakoutPanel }      from "./ui/BreakoutPanel.jsx";
import { ExpiryCards }        from "./ui/ExpiryCards.jsx";

// ─── Tab definition ───────────────────────────────────────────

function Tab({ id, label, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "5px 12px", borderRadius: 5, border: "none", cursor: "pointer",
        fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600,
        background: activeTab === id ? C.surface2 : "transparent",
        color:      activeTab === id ? C.text     : C.muted,
      }}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════
export default function App({ initialSymbol = null }) {
  const defaultInstrument = initialSymbol ?? FO_LIST[0];

  const [instrument,     setInstrument]     = useState(defaultInstrument);
  const [scalpMode,      setScalpMode]      = useState(false);
  const [activeTab,      setActiveTab]      = useState("oi");
  const [selectedExpiry, setSelectedExpiry] = useState(null);

  const isIndex = instrument.type === "index";

  // ── Data fetching ─────────────────────────────────────────
  const { rawData, prevRawData, loading, error, fetchedAt, retry, mktStatus } =
    useOptionChain(instrument);

  // ── Reset UI state on symbol change ──────────────────────
  useEffect(() => {
    setSelectedExpiry(null);
    setActiveTab("oi");
  }, [instrument]);

  // ── Derived chain data (all memoised in one place) ────────
  const {
    rows, prevRows, displayRows, prevDisplayRows,
    expiries, activeExpiry, underlyingValue,
    atm, pcr, maxPain, sig, chartData,
  } = useChainDerived({ rawData, prevRawData, isIndex, selectedExpiry, scalpMode });

  // ── Snapshot history + breakout signals ──────────────────
  const { breakoutSignals } = useSnapshotHistory({
    rows, displayRows, prevDisplayRows,
    underlyingValue, atm, pcr, maxPain,
    instrument, activeExpiry,
  });

  // ── Handlers ─────────────────────────────────────────────
  const handleSymbolChange = useCallback((ins) => setInstrument(ins), []);
  const handleExpirySelect = useCallback((ex) => {
    setSelectedExpiry(ex);
    setActiveTab("oi");
  }, []);

  const timestamp = rawData?.timestamp ?? "—";
  const pcrVal    = sig ? parseFloat(sig.pcr) : 0;
  const pcrColor  = pcrVal > 1.2 ? C.green : pcrVal < 0.8 ? C.red : C.yellow;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'IBM Plex Mono',monospace" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 12px 24px" }}>

        {/* ═══ TOP BAR ══════════════════════════════════════ */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <SymbolPicker selected={instrument} onChange={handleSymbolChange} />

            {!isIndex && expiries.length > 0 && (
              <select
                value={activeExpiry || ""}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                style={{
                  padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${C.border}`, background: C.surface, color: C.text,
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, flexShrink: 0,
                }}
              >
                {expiries.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            )}

            <button
              onClick={() => setScalpMode((s) => !s)}
              style={{
                padding: "7px 12px", borderRadius: 7, flexShrink: 0, cursor: "pointer",
                border: `1px solid ${scalpMode ? C.yellow : C.border}`,
                background: scalpMode ? "#2d2200" : "transparent",
                color: scalpMode ? C.yellow : C.muted,
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600,
              }}
            >
              ⚡ {scalpMode ? "NEARBY ONLY" : "NEARBY STRIKES"}
            </button>

            <button
              onClick={retry}
              disabled={loading}
              title="Refresh now"
              style={{
                padding: "7px 10px", borderRadius: 7, flexShrink: 0,
                border: `1px solid ${C.border}`, background: "transparent",
                color: loading ? C.muted : C.text,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, opacity: loading ? 0.5 : 1,
              }}
            >
              ↺
            </button>

            <div style={{ marginLeft: "auto" }}>
              {loading   ? <span style={{ fontSize: 10, color: C.blue }}>● Loading…</span>
             : fetchedAt ? <RefreshCountdown fetchedAt={fetchedAt} />
             : null}
            </div>
          </div>

          {/* Title row */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: isIndex ? C.blue : C.purple }}>
              {instrument.symbol}
            </span>
            {underlyingValue > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                ₹{underlyingValue.toLocaleString("en-IN")}
              </span>
            )}
            <span style={{ fontSize: 11, color: C.muted }}>{instrument.name}</span>
            <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>{timestamp}</span>
          </div>

          {/* Meta pills */}
          <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, background: C.surface2, color: C.muted, padding: "2px 8px", borderRadius: 4 }}>
              Lot size: <b style={{ color: C.text }}>{instrument.lot}</b>
            </span>
            {!isIndex && activeExpiry && (
              <span style={{ fontSize: 10, background: "#1a0a1a", color: C.purple, padding: "2px 8px", borderRadius: 4 }}>
                Expiry: {activeExpiry}
              </span>
            )}
            {scalpMode && (
              <span style={{ fontSize: 10, background: "#2d2200", color: C.yellow, padding: "2px 8px", borderRadius: 4 }}>
                Showing ±{isIndex ? 200 : 100} points from current price
              </span>
            )}
          </div>
        </div>

        {/* ═══ ERROR / LOADING ══════════════════════════════ */}
        {error && <ErrorPanel error={error} onRetry={retry} instrument={instrument} />}
        {loading && !rawData && <LoadingSkeleton />}

        {/* ═══ MAIN CONTENT ════════════════════════════════ */}
        {rawData && (
          <>
            {sig && <SignalBanner sig={sig} atm={atm} maxPain={maxPain} spot={underlyingValue} />}
            {sig && <ZoneBadges sig={sig} />}

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 3, marginBottom: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, flexWrap: "wrap" }}>
              <Tab id="oi"       label="OI Chart"          activeTab={activeTab} setActiveTab={setActiveTab} />
              <Tab id="doi"      label="ΔOI Activity"      activeTab={activeTab} setActiveTab={setActiveTab} />
              <Tab id="table"    label="Strike Table"       activeTab={activeTab} setActiveTab={setActiveTab} />
              <Tab id="inst"     label="🧠 Smart Money"    activeTab={activeTab} setActiveTab={setActiveTab} />
              <Tab id="breakout" label={`⚡ Breakouts${breakoutSignals.length ? ` (${breakoutSignals.length})` : ""}`} activeTab={activeTab} setActiveTab={setActiveTab} />
              {!isIndex && <Tab id="expiry" label="All Expiries" activeTab={activeTab} setActiveTab={setActiveTab} />}
            </div>

            {/* Refresh overlay */}
            <div style={{ position: "relative" }}>
              {loading && rawData && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 10, borderRadius: 10,
                  background: `${C.bg}55`, display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(1px)",
                }}>
                  <span style={{ color: C.blue, fontSize: 11 }}>● Refreshing data…</span>
                </div>
              )}

              {activeTab === "oi"      && <OIChart chartData={chartData} atm={atm} maxPain={maxPain} sig={sig} />}
              {activeTab === "doi"     && <DeltaOIChart chartData={chartData} atm={atm} />}
              {activeTab === "table"   && sig && <StrikeTable displayRows={displayRows} atm={atm} sig={sig} />}
              {activeTab === "inst"    && (
                <InstitutionalPanel
                  rows={displayRows} prevRows={prevDisplayRows}
                  spot={underlyingValue} atm={atm} maxPain={maxPain} pcr={pcr} sig={sig}
                />
              )}
              {activeTab === "breakout" && <BreakoutPanel signals={breakoutSignals} fetchedAt={fetchedAt} />}
              {activeTab === "expiry" && !isIndex && (
                <ExpiryCards
                  rawData={rawData} expiries={expiries} activeExpiry={activeExpiry}
                  instrument={instrument} onSelectExpiry={handleExpirySelect}
                />
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", fontSize: 10, color: C.muted,
              marginTop: 4, paddingTop: 8, borderTop: `1px solid ${C.border}`,
            }}>
              <span>Symbol: <b style={{ color: C.text }}>{instrument.symbol}</b></span>
              <span>·</span>
              <span>Lot size: <b style={{ color: C.text }}>{instrument.lot}</b></span>
              <span>·</span>
              <span>ATM: <b style={{ color: C.blue }}>{atm || "—"}</b></span>
              <span>·</span>
              <span>Max Pain: <b style={{ color: C.yellow }}>{maxPain || "—"}</b></span>
              <span>·</span>
              <span>
                Market mood (PCR):{" "}
                <b style={{ color: pcrColor }}>{sig ? pcrLabel(pcrVal) : "—"}</b>
              </span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                {timestamp}
                <span style={{
                  padding: "1px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  background: mktStatus?.open ? "#0d2a16" : "#1c2128",
                  color:      mktStatus?.open ? "#3fb950" : "#8b949e",
                  border:     `1px solid ${mktStatus?.open ? "#3fb95044" : "#30363d"}`,
                }}>
                  {mktStatus?.label ?? "—"}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
