// src/components/OptionChainNew/ui/NextDaySignalPanel.jsx
// ═══════════════════════════════════════════════════════════════════════════
// 3:15 PM IST NEXT-DAY OPTION SIGNAL DASHBOARD PANEL
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { C } from "../constants.js";
import { getNextDayOptionSignalAction } from "../../../app/actions/nextDayOptionSignal.js";

export function NextDaySignalPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSignal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNextDayOptionSignalAction();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load 3:15 PM setup");
      }
    } catch (err) {
      setError(err.message || "Network error loading signal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignal();
  }, []);

  const handleCopyTelegram = async () => {
    if (!data?.telegramText) return;
    try {
      await navigator.clipboard.writeText(data.telegramText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: "30px 20px", textAlign: "center", color: C.muted, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} style={{ display: "inline-block", fontSize: 24, marginBottom: 8 }}>
          ⚙️
        </motion.div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Analyzing NIFTY 3:15 PM Option Chain & Market Structure...</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Synthesizing 100-pt institutional orderflow score & next-day triggers</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: "20px", background: "#2a0d0d", border: `1px solid ${C.red}55`, borderRadius: 10, color: C.text }}>
        <div style={{ fontWeight: 700, color: C.red, marginBottom: 6 }}>✖ Failed to load 3:15 PM Setup</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{error}</div>
        <button onClick={() => fetchSignal()} style={{ padding: "6px 14px", borderRadius: 6, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, cursor: "pointer", fontSize: 11 }}>
          ↺ Retry Analysis
        </button>
      </div>
    );
  }

  const res = data?.result;
  if (!res) return null;

  const isCE = res.primarySignal === "BUY CE";
  const isPE = res.primarySignal === "BUY PE";
  const isNoTrade = res.primarySignal === "NO TRADE";

  const signalColor = isCE ? C.green : isPE ? C.red : C.muted;
  const signalBg = isCE ? C.greenBg : isPE ? C.redBg : C.surface2;
  const opt = res.recommendedOption;
  const tl = res.tradeLevels;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Header Banner ── */}
      <div
        style={{
          background: signalBg,
          border: `1px solid ${signalColor}55`,
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
              ⏰ Daily 3:15 PM IST Setup · {res.date}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 700,
                background: C.surface,
                color: res.confidence === "HIGH" ? C.green : res.confidence === "MEDIUM" ? C.yellow : C.muted,
                border: `1px solid ${C.border}`,
              }}
            >
              CONFIDENCE: {res.confidence}
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: signalColor, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{isCE ? "▲" : isPE ? "▼" : "—"}</span>
            <span>{res.primarySignal}</span>
            {!isNoTrade && opt && (
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text, opacity: 0.9 }}>
                ({opt.strike} {opt.type || (isCE ? "CE" : "PE")})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleCopyTelegram}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: copied ? C.green : C.surface,
              color: copied ? "#000" : C.text,
              border: `1px solid ${C.border}`,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span>{copied ? "✔ Copied!" : "📱 Copy Telegram Format"}</span>
          </button>

          <button
            onClick={() => fetchSignal(true)}
            disabled={loading}
            title="Recalculate 3:15 PM signal"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              fontSize: 12,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Key Metrics Overview Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>NIFTY SPOT</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>₹{res.spot?.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 10, color: res.dayChangePct >= 0 ? C.green : C.red }}>
            {res.dayChangePct >= 0 ? `+${res.dayChangePct}%` : `${res.dayChangePct}%`}
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>STRUCTURE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 3 }}>{res.marketStructure}</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>PCR / ΔOI PCR</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.yellow }}>
            {res.pcr?.toFixed(2)} <span style={{ fontSize: 11, color: C.muted }}>/ {res.changeOiPcr?.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>SUPPORT (S1 / S2)</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
            {res.support1} <span style={{ fontSize: 11, color: C.muted }}>/ {res.support2}</span>
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>RESISTANCE (R1 / R2)</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>
            {res.resistance1} <span style={{ fontSize: 11, color: C.muted }}>/ {res.resistance2}</span>
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>FINAL SCORE</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: res.finalScore > 0 ? C.green : res.finalScore < 0 ? C.red : C.muted }}>
            {res.finalScore > 0 ? `+${res.finalScore}` : res.finalScore} / 100
          </div>
        </div>
      </div>

      {/* ── Trade Execution Blueprint ── */}
      {!isNoTrade && opt && tl && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            📋 Next-Day Trade Execution Blueprint
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
            <div style={{ background: C.surface2, padding: "10px 12px", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: C.muted }}>RECOMMENDED OPTION</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{opt.optionName}</div>
              <div style={{ fontSize: 10, color: C.muted }}>Expiry: {opt.expiry} · LTP: ₹{opt.ltp}</div>
            </div>

            <div style={{ background: C.surface2, padding: "10px 12px", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: C.muted }}>PRIMARY SPOT TRIGGER</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: signalColor, marginTop: 2 }}>{tl.entryTrigger}</div>
              <div style={{ fontSize: 10, color: C.muted }}>Do not buy unless spot sustains trigger</div>
            </div>

            <div style={{ background: C.surface2, padding: "10px 12px", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: C.muted }}>OPTION ENTRY ZONE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{tl.entryZone}</div>
              <div style={{ fontSize: 10, color: C.muted }}>Current Premium: ₹{opt.ltp}</div>
            </div>

            <div style={{ background: C.surface2, padding: "10px 12px", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: C.muted }}>STOP LOSS & TARGETS</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 2 }}>
                SL: <span style={{ color: C.red }}>₹{tl.stopLoss}</span> · T1: <span style={{ color: C.green }}>₹{tl.target1}</span> · T2: <span style={{ color: C.green }}>₹{tl.target2}</span>
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>Risk / Reward: 1 : {tl.riskRewardRatio}</div>
            </div>
          </div>

          <div style={{ background: "#221900", border: `1px solid ${C.yellow}44`, borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#ffd566" }}>
            <b>⚠️ Invalidation & Risk Rule:</b> {res.invalidation}
          </div>
        </div>
      )}

      {/* ── Confluence & Rationale ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>
          💡 Institutional Evidence & Confluence
        </div>
        {res.whyReasons?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {res.whyReasons.map((reason, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: C.text }}>
                <span style={{ color: signalColor, fontWeight: 700 }}>{idx + 1}.</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.muted }}>
            Market indicators are currently balanced between Call and Put writers without an edge meeting the 60-point threshold.
          </div>
        )}
      </div>

      {/* ── Full Text Output Container ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase" }}>
          📄 Full Section 12 Specification Report
        </div>
        <pre
          style={{
            background: C.bg,
            padding: "12px",
            borderRadius: 6,
            fontSize: 11,
            color: C.text,
            overflowX: "auto",
            lineHeight: 1.5,
            border: `1px solid ${C.border}`,
            margin: 0,
          }}
        >
          {data?.fullReport}
        </pre>
      </div>
    </div>
  );
}
