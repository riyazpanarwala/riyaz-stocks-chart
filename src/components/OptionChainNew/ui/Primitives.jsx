// ═══════════════════════════════════════════════════════════════
// SHARED PRIMITIVE UI COMPONENTS
// Small, pure, memoised building-blocks used across panels.
// ═══════════════════════════════════════════════════════════════
import React from "react";
import { C } from "../constants.js";

// ─── Card wrapper ─────────────────────────────────────────────

export const Card = React.memo(function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "12px 14px", marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
});

// ─── Card title ───────────────────────────────────────────────

export const CardTitle = React.memo(function CardTitle({ icon, children }) {
  return (
    <div style={{
      fontSize: 10, color: C.muted, letterSpacing: 1,
      marginBottom: 10, textTransform: "uppercase",
    }}>
      {icon} {children}
    </div>
  );
});

// ─── Confidence badge ─────────────────────────────────────────

const IBADGE_MAP = {
  HIGH: { bg: C.greenBg, color: C.green, border: `${C.green}40` },
  MED: { bg: "#1c1400", color: C.yellow, border: `${C.yellow}40` },
  LOW: { bg: C.surface2, color: C.muted, border: C.border },
  TRAP: { bg: "#2a1500", color: "#ff7b00", border: "#ff7b0040" },
};
const IBADGE_LABEL = { HIGH: "HIGH", MED: "MEDIUM", LOW: "LOW", TRAP: "RISKY" };

export const IBadge = React.memo(function IBadge({ conf }) {
  const s = IBADGE_MAP[conf] ?? IBADGE_MAP.LOW;
  return (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 4,
      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      flexShrink: 0,
    }}>
      {IBADGE_LABEL[conf] ?? conf}
    </span>
  );
});

// ─── Strength bar ─────────────────────────────────────────────

export const StrengthBar = React.memo(function StrengthBar({ value, color, width = 80 }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barColor = color
    ?? (value > 70 ? C.green : value > 50 ? C.yellow : C.muted);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width, height: 5, background: C.border,
        borderRadius: 3, overflow: "hidden",
      }}>
        <div style={{
          width: `${clampedValue}%`, height: "100%",
          background: barColor, borderRadius: 3,
        }} />
      </div>
    </div>
  );
});

// ─── Strike pill ─────────────────────────────────────────────

export const StrikePill = React.memo(function StrikePill({ strike, color, bg, border, style }) {
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: bg ?? "#111",
      color: color ?? C.text,
      border: `1px solid ${border ?? C.border}`,
      ...style,
    }}>
      {strike}
    </span>
  );
});

// ─── Section label ────────────────────────────────────────────

export const SectionLabel = React.memo(function SectionLabel({ color = C.muted, children, style }) {
  return (
    <div style={{ fontSize: 9, color, letterSpacing: 1, marginBottom: 5, ...style }}>
      {children}
    </div>
  );
});

// ─── Loading skeleton shimmer ─────────────────────────────────

export const ShimmerBar = React.memo(function ShimmerBar({ w, h = 10, r = 4 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: `linear-gradient(90deg, ${C.surface} 25%, ${C.surface2} 50%, ${C.surface} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
});
