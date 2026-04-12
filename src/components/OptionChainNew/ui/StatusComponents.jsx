// ═══════════════════════════════════════════════════════════════
// HEADER / STATUS UI COMPONENTS
// SignalBanner · ZoneBadges · RefreshCountdown
// LoadingSkeleton · ErrorPanel
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { C, REFRESH_MS } from "../constants.js";
import { pcrLabel } from "../utils/formatters.js";
import { sigMeta } from "../utils/signalEngine.js";
import { ShimmerBar } from "./Primitives.jsx";

// ─── Signal Banner ────────────────────────────────────────────

export const SignalBanner = React.memo(function SignalBanner({ sig, atm, maxPain, spot }) {
  const meta     = sigMeta(sig.rawSignal);
  const pcrVal   = parseFloat(sig.pcr);
  const pcrColor = pcrVal > 1.2 ? C.green : pcrVal < 0.8 ? C.red : C.yellow;

  return (
    <div style={{
      background: meta.bg, border: `1px solid ${meta.color}40`, borderRadius: 10,
      padding: "12px 14px", marginBottom: 12,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: meta.color, letterSpacing: 1 }}>
          {meta.icon} {sig.signal}
        </span>
        <div>
          <div style={{ fontSize: 10, color: C.muted }}>Signal Strength</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 80, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                width: `${sig.strength}%`, height: "100%", borderRadius: 3,
                background: sig.strength > 70 ? C.green : sig.strength > 50 ? C.yellow : C.muted,
              }} />
            </div>
            <span style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>{sig.strength}%</span>
            <span style={{ color: C.muted, fontSize: 10 }}>{sig.strengthLabel}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { l: "Current Price",      v: spot?.toFixed(1), c: C.text    },
          { l: "ATM Strike",         v: atm,              c: C.blue    },
          { l: "Max Pain",           v: maxPain,          c: C.yellow  },
          { l: "PCR",                v: sig.pcr,          c: pcrColor, sub: sig.pcrBias },
          { l: "Gap to Resistance",  v: `+${sig.distToRes}`, c: C.red   },
          { l: "Gap to Support",     v: `-${sig.distToSup}`, c: C.green },
        ].map(({ l, v, c, sub }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.muted }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
            {sub && <div style={{ fontSize: 9, color: c }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Zone Badges ─────────────────────────────────────────────

export const ZoneBadges = React.memo(function ZoneBadges({ sig }) {
  const pcrColor = parseFloat(sig.pcr) > 1.2 ? C.green : parseFloat(sig.pcr) < 0.8 ? C.red : C.yellow;
  const oiColor  = sig.oiChangeBias === "New buying activity"  ? C.green
                 : sig.oiChangeBias === "New selling activity" ? C.red
                 : C.yellow;

  const ZonePill = ({ strike, primary }) => (
    <span style={{
      background: primary ? (strike > 0 ? C.greenBg : C.redBg) : "#111",
      border: `1px solid ${primary ? (strike > 0 ? C.green : C.red) : C.border}40`,
      color:  primary ? (strike > 0 ? C.green : C.red) : C.muted,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
    }}>{strike}</span>
  );

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 9, color: C.green, marginBottom: 5, letterSpacing: 1 }}>
          ▲ SUPPORT — Price floor (strong Put positions below)
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {sig.topSupport.length
            ? sig.topSupport.map((s, i) => <ZonePill key={s} strike={s} primary={i === 0} />)
            : <span style={{ color: C.muted, fontSize: 10 }}>No data below price</span>}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 9, color: C.red, marginBottom: 5, letterSpacing: 1 }}>
          ▼ RESISTANCE — Price ceiling (strong Call positions above)
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {sig.topResistance.length
            ? sig.topResistance.map((s, i) => <ZonePill key={s} strike={-s} primary={i === 0} />)
            : <span style={{ color: C.muted, fontSize: 10 }}>No data above price</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 9, color: C.muted }}>RECENT ACTIVITY</div>
        <span style={{ color: oiColor, fontWeight: 700, fontSize: 12 }}>{sig.oiChangeBias}</span>
        <div style={{ fontSize: 9, color: C.muted }}>OVERALL MOOD (PCR)</div>
        <span style={{ color: pcrColor, fontWeight: 700, fontSize: 12 }}>{sig.pcrBias}</span>
      </div>
    </div>
  );
});

// ─── Refresh Countdown ────────────────────────────────────────

export const RefreshCountdown = React.memo(function RefreshCountdown({ fetchedAt }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!fetchedAt) return;
    const tick = () => setSecs(Math.max(0, Math.round((REFRESH_MS - (Date.now() - fetchedAt)) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  const pct = fetchedAt ? Math.min(100, Math.round(((Date.now() - fetchedAt) / REFRESH_MS) * 100)) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={16} height={16} style={{ flexShrink: 0 }}>
        <circle cx={8} cy={8} r={6} fill="none" stroke={C.border} strokeWidth={2} />
        <circle cx={8} cy={8} r={6} fill="none" stroke={C.blue} strokeWidth={2}
          strokeDasharray={`${(pct / 100) * 37.7} 37.7`}
          strokeLinecap="round" transform="rotate(-90 8 8)"
          style={{ transition: "stroke-dasharray 1s linear" }}
        />
      </svg>
      <span style={{ fontSize: 10, color: C.muted }}>
        {secs > 0 ? `next refresh in ${secs}s` : "refreshing…"}
      </span>
    </div>
  );
});

// ─── Loading Skeleton ─────────────────────────────────────────

export function LoadingSkeleton() {
  return (
    <div style={{ padding: "0 0 24px" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{
        background: C.surface, borderRadius: 10, padding: 16, marginBottom: 12,
        display: "flex", gap: 16, alignItems: "center",
      }}>
        <ShimmerBar w={120} h={28} r={6} />
        <ShimmerBar w={200} h={14} />
        <ShimmerBar w={80}  h={28} r={6} />
        <ShimmerBar w={80}  h={28} r={6} />
        <ShimmerBar w={80}  h={28} r={6} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {[0, 1].map((k) => (
          <div key={k} style={{ flex: 1, background: C.surface, borderRadius: 8, padding: 12, display: "flex", gap: 8 }}>
            {[60, 60, 60].map((w, i) => <ShimmerBar key={i} w={w} h={22} />)}
          </div>
        ))}
      </div>
      <div style={{
        background: C.surface, borderRadius: 10, padding: 16, height: 250,
        display: "flex", alignItems: "flex-end", gap: 4,
      }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            flex: 1, background: C.surface2, borderRadius: "3px 3px 0 0", opacity: 0.5,
            height: `${20 + Math.sin(i) * 30 + 40}%`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Error Panel ─────────────────────────────────────────────

export const ErrorPanel = React.memo(function ErrorPanel({ error, onRetry, instrument }) {
  return (
    <div style={{
      background: "#1a0808", border: `1px solid ${C.red}40`, borderRadius: 10,
      padding: "20px 24px", marginBottom: 12, textAlign: "center",
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div style={{ color: C.red, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
        Could not load data for {instrument.symbol}
      </div>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 16, fontFamily: "monospace" }}>
        {error}
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 20px", borderRadius: 6, cursor: "pointer",
          border: `1px solid ${C.red}`, background: C.redBg, color: C.red,
          fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: 12,
        }}
      >
        ↺ Try Again
      </button>
    </div>
  );
});
