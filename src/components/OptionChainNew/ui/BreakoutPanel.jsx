// ═══════════════════════════════════════════════════════════════
// BREAKOUT PANEL
// ═══════════════════════════════════════════════════════════════
import React from "react";
import { C } from "../constants.js";
import { breakoutSignalMeta } from "../utils/breakoutDetector.js";

const SecondarySignal = React.memo(function SecondarySignal({ sig, isLast }) {
  const sm = breakoutSignalMeta(sig.type);
  return (
    <div style={{
      padding: "9px 14px", display: "flex", alignItems: "flex-start", gap: 10,
      borderBottom: isLast ? "none" : "1px solid #21262d",
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{sm.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: sm.color, fontWeight: 600 }}>{sig.title}</div>
        <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2 }}>{sig.detail}</div>
        {sig.strike && (
          <div style={{
            display: "inline-block", marginTop: 4, padding: "1px 7px", borderRadius: 3,
            fontSize: 9, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`,
          }}>
            Strike {sig.strike}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        <div style={{ width: 50, height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${sig.strength}%`, height: "100%", background: sm.color, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 10, color: sm.color }}>{sig.strength}%</span>
      </div>
    </div>
  );
});

export const BreakoutPanel = React.memo(function BreakoutPanel({ signals, fetchedAt }) {
  if (!signals?.length) {
    return (
      <div style={{
        background: "#0d1117", border: "1px solid #21262d", borderRadius: 10,
        padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>🔍</span>
        <div>
          <div style={{ fontSize: 12, color: "#8b949e" }}>No breakout signals detected right now</div>
          <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2 }}>
            The engine scans on every 2-min refresh. Signals appear when OI imbalances, wall shifts, or momentum patterns are detected.
          </div>
        </div>
      </div>
    );
  }

  const [top, ...rest] = signals;
  const meta = breakoutSignalMeta(top.type);

  return (
    <div style={{ border: `1px solid ${meta.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
      {/* Top signal header */}
      <div style={{
        background: meta.bg, padding: "10px 14px", borderBottom: `1px solid ${meta.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{top.title}</div>
            <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2 }}>{top.detail}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#8b949e", marginBottom: 3 }}>SIGNAL STRENGTH</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 80, height: 5, background: "#21262d", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${top.strength}%`, height: "100%", background: meta.color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{top.strength}%</span>
            </div>
          </div>
          <span style={{
            padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
          }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Secondary signals */}
      {rest.length > 0 && (
        <div style={{ background: "#161b22" }}>
          {rest.map((s, i) => (
            <SecondarySignal key={s.id} sig={s} isLast={i === rest.length - 1} />
          ))}
        </div>
      )}

      {/* Footer: source tags */}
      <div style={{
        background: "#0d1117", padding: "6px 14px", borderTop: "1px solid #21262d",
        display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 9, color: "#8b949e" }}>Sources:</span>
        {[...new Set(signals.map((s) => s.source))].map((src) => (
          <span key={src} style={{
            fontSize: 9, background: "#1c2128", color: "#8b949e",
            padding: "1px 6px", borderRadius: 3, border: "1px solid #30363d",
          }}>
            {src}
          </span>
        ))}
        {fetchedAt && (
          <span style={{ fontSize: 9, color: "#8b949e", marginLeft: "auto" }}>
            Last scan: {new Date(fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
});
