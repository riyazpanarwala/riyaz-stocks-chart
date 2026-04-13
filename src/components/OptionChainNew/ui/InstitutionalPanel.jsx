// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL PANEL  (Smart Money tab)
// ═══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { C } from "../constants.js";
import { fmtK, pcrLabel, atmShiftLabel } from "../utils/formatters.js";
import { calcInstitutional, diffInstitutional } from "../utils/institutionalAnalysis.js";
import { sigMeta } from "../utils/signalEngine.js";
import { Card, CardTitle, IBadge } from "./Primitives.jsx";

// ─── Sub-components ───────────────────────────────────────────

const DiffAlerts = React.memo(function DiffAlerts({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div style={{
      background: "#130c00", border: "1px solid #ff7b0055", borderRadius: 10,
      padding: "12px 14px", marginBottom: 10,
    }}>
      <div style={{ fontSize: 10, color: "#ff7b00", letterSpacing: 1, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13 }}>🔔</span> WHAT CHANGED IN THE LAST 2 MINUTES
      </div>
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0",
          borderBottom: i < alerts.length - 1 ? "1px solid #ff7b0022" : "none",
        }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
            {a.severity === "SURGE" ? "🚨" : a.type === "FLIP" ? "🔄" : a.type === "WALL_SHIFT" ? "🧱" : a.side === "CE" ? "🔴" : "🟢"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#ff9a3c" }}>{a.label}</div>
            <div style={{ fontSize: 10, color: "#ff7b0088", marginTop: 2 }}>{a.detail}</div>
          </div>
          <span style={{
            fontSize: 9, padding: "2px 7px", borderRadius: 4, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
            background: a.severity === "SURGE" ? "#3a0000" : a.severity === "FLIP" ? "#0d1e2e" : "#1a0c00",
            color:      a.severity === "SURGE" ? C.red    : a.severity === "FLIP" ? C.blue    : "#ff7b00",
            border:     `1px solid ${a.severity === "SURGE" ? C.red + "44" : a.severity === "FLIP" ? C.blue + "44" : "#ff7b0044"}`,
          }}>
            {a.severity === "SURGE" ? "SURGING" : a.severity === "FLIP" ? "SHIFTED" : "NEW"}
          </span>
        </div>
      ))}
    </div>
  );
});

// ─── Main panel ───────────────────────────────────────────────

export const InstitutionalPanel = React.memo(function InstitutionalPanel({
  rows, prevRows, spot, atm, maxPain, pcr, sig,
}) {
  const inst       = useMemo(() => calcInstitutional(rows, spot, atm, pcr), [rows, spot, atm, pcr]);
  const diffAlerts = useMemo(() => diffInstitutional(prevRows, rows, spot), [prevRows, rows, spot]);

  if (!inst) return null;

  const {
    topSpikes, clusters, rolls, traps,
    highConvZones, lowConvNoise, atmShift, signals,
    top3Ce, top3Pe, concCe, concPe, totalCeOI, totalPeOI,
    topRes, topSup,
  } = inst;

  const meta      = sigMeta(sig?.rawSignal ?? "NO TRADE");
  const maxCeOI   = Math.max(...top3Ce.map((r) => r.CE.openInterest), 1);
  const maxPeOI   = Math.max(...top3Pe.map((r) => r.PE.openInterest), 1);
  const fmt       = fmtK;

  // ── Factor breakdown cards ─────────────────────────────────
  const factors = [
    {
      label: "Market Mood (PCR)", value: pcrLabel(pcr), detail: `PCR ${pcr.toFixed(2)}`,
      vote: pcr > 1.2 ? "UP" : pcr < 0.8 ? "DOWN" : "NEUTRAL",
      color: pcr > 1.2 ? C.green : pcr < 0.8 ? C.red : C.yellow,
    },
    {
      label: "Near Price Activity", value: atmShiftLabel(atmShift).split(" (")[0], detail: "positions near current price",
      vote: atmShift === "PE Dominant" ? "UP" : atmShift === "CE Dominant" ? "DOWN" : "NEUTRAL",
      color: atmShift === "PE Dominant" ? C.green : atmShift === "CE Dominant" ? C.red : C.muted,
    },
    {
      label: "Recent Trades", value: sig?.oiChangeBias ?? "—", detail: "OI change at ATM",
      vote: sig?.oiChangeBias === "New buying activity" ? "UP" : sig?.oiChangeBias === "New selling activity" ? "DOWN" : "NEUTRAL",
      color: sig?.oiChangeBias === "New buying activity" ? C.green : sig?.oiChangeBias === "New selling activity" ? C.red : C.yellow,
    },
    {
      label: "Gap to Support", value: sig ? `-${sig.distToSup} pts` : "—", detail: "how far below floor is",
      vote: sig && sig.distToSup < sig.distToRes ? "UP" : "DOWN",
      color: sig && sig.distToSup < sig.distToRes ? C.green : C.red,
    },
    {
      label: "Gap to Resistance", value: sig ? `+${sig.distToRes} pts` : "—", detail: "how far above ceiling is",
      vote: sig && sig.distToRes > sig.distToSup ? "UP" : "DOWN",
      color: sig && sig.distToRes > sig.distToSup ? C.green : C.red,
    },
  ];

  return (
    <div>
      <DiffAlerts alerts={diffAlerts} />

      {/* ── Signal header ── */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{
            background: meta.bg, border: `1px solid ${meta.color}44`, borderRadius: 8, padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: meta.color, letterSpacing: 0.5 }}>
              {meta.icon} {sig?.signal ?? "—"}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>SIGNAL STRENGTH</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 120, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${sig?.strength ?? 0}%`, height: "100%", borderRadius: 3,
                  background: (sig?.strength ?? 0) > 70 ? C.green : (sig?.strength ?? 0) > 50 ? C.yellow : C.muted,
                }} />
              </div>
              <span style={{ color: meta.color, fontWeight: 700, fontSize: 14 }}>{sig?.strength ?? 0}%</span>
              <span style={{ color: C.muted, fontSize: 10 }}>{sig?.strengthLabel ?? ""}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              This matches the signal shown in the top banner — both use the same analysis
            </div>
          </div>
        </div>

        {/* Factor breakdown */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
            Why this signal — 5 factors analysed
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {factors.map(({ label, value, detail, vote, color }) => (
              <div key={label} style={{ flex: "1 1 140px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{detail}</div>
                <div style={{
                  marginTop: 5, display: "inline-block", padding: "1px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700,
                  background: vote === "UP" ? C.greenBg : vote === "DOWN" ? C.redBg : C.surface2,
                  color:      vote === "UP" ? C.green   : vote === "DOWN" ? C.red   : C.yellow,
                  border:     `1px solid ${vote === "UP" ? C.green + "40" : vote === "DOWN" ? C.red + "40" : C.yellow + "40"}`,
                }}>
                  {vote === "UP" ? "▲ Bullish vote" : vote === "DOWN" ? "▼ Bearish vote" : "— Neutral"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key stats */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {[
            { l: "Max Pain",          v: maxPain,       c: C.yellow,                   sub: "where price is pulled at expiry" },
            { l: "Big Moves Detected",v: topSpikes.length, c: C.blue,                  sub: "institutional spikes" },
            { l: "Danger Zones",      v: traps.length,  c: traps.length > 0 ? "#ff7b00" : C.muted, sub: "strikes to avoid" },
          ].map(({ l, v, c, sub }) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.muted }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 9, color: C.muted }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Support / Resistance ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        {[
          { zones: topSup, side: "PE", label: "▲ SUPPORT LEVELS — Price floor below current price",  hint: "Big players have placed large Put positions here — these act as cushions",  color: C.green, total: totalPeOI },
          { zones: topRes, side: "CE", label: "▼ RESISTANCE LEVELS — Price ceiling above current price", hint: "Big players have placed large Call positions here — these act as barriers", color: C.red,   total: totalCeOI },
        ].map(({ zones, side, label, hint, color, total }) => {
          const oiSum = zones.reduce((s, r) => s + r[side].openInterest, 0);
          return (
            <div key={side} style={{ flex: 1, minWidth: 160, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color, letterSpacing: 1, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 9, color: `${color}88`, marginBottom: 6 }}>{hint}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {zones.length
                  ? zones.map((r, i) => (
                    <span key={r.strikePrice} style={{
                      background: i === 0 ? (side === "PE" ? C.greenBg : C.redBg) : "#111",
                      border: `1px solid ${color}40`, color, padding: "2px 9px", borderRadius: 4,
                      fontSize: 11, fontWeight: 700, opacity: 1 - i * 0.2,
                    }}>{r.strikePrice}</span>
                  ))
                  : <span style={{ color: C.muted, fontSize: 10 }}>No {side === "PE" ? "support" : "resistance"} found</span>}
              </div>
              {zones.length > 0 && (
                <div style={{ fontSize: 10, color: `${color}88`, marginTop: 6 }}>
                  Total size: {fmt(oiSum)} ({((oiSum / (total || 1)) * 100).toFixed(1)}% of all {side === "PE" ? "Put" : "Call"} positions)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Top spikes ── */}
      <Card>
        <CardTitle icon="🔥">Biggest Position Changes (Where Big Money Moved)</CardTitle>
        {topSpikes.length === 0
          ? <div style={{ fontSize: 11, color: C.muted }}>No unusually large position changes detected.</div>
          : topSpikes.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
              borderBottom: i < topSpikes.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{s.side === "CE" ? "🔴" : "🟢"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.text }}>{s.type}</div>
                <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>
                  Strike {s.strike} · {s.side === "CE" ? "Call" : "Put"} · Positions added: {fmt(s.doi)} · Volume: {fmt(s.vol)} · Price: ₹{s.ltp}
                  {s.chg !== undefined && (
                    <span style={{ color: s.chg >= 0 ? C.green : C.red }}>
                      {" "}({s.chg > 0 ? "+" : ""}{typeof s.chg === "number" ? s.chg.toFixed(1) : s.chg}%)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, marginTop: 3, color: s.highConv ? C.green : C.muted }}>
                  {s.highConv ? "✓ Confirmed by trading volume — likely a genuine institutional move" : "⚠ Low trading volume — could be a passive or misleading entry"}
                </div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>
                  {s.nearness} · {clusters.some((c) => c.includes(s.strike)) ? "Part of a cluster of positions" : "Isolated position"}
                </div>
              </div>
              <IBadge conf={s.highConv ? "HIGH" : "LOW"} />
            </div>
          ))}
      </Card>

      {/* ── Signals ── */}
      {signals.length > 0 && (
        <Card>
          <CardTitle icon="⚡">What This Means for You</CardTitle>
          {signals.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
              borderBottom: i < signals.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ flex: 1, fontSize: 12, color: C.text }}>{s.label}</div>
              <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginRight: 6 }}>{s.strike}</span>
              <IBadge conf={s.conf} />
            </div>
          ))}
        </Card>
      )}

      {/* ── Traps ── */}
      {traps.length > 0 && (
        <Card style={{ border: "1px solid #ff7b0033" }}>
          <CardTitle icon="⚠️">⚠ Zones to Avoid Trading</CardTitle>
          {traps.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0",
              borderBottom: i < traps.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, color: "#ff7b00" }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#ff7b00" }}>{t.msg}</div>
                <div style={{ fontSize: 10, color: "#ff7b0088", marginTop: 2 }}>Avoid entering new trades at this strike — conditions are unstable</div>
              </div>
              <IBadge conf="TRAP" />
            </div>
          ))}
        </Card>
      )}

      {/* ── Rolls ── */}
      {rolls.length > 0 && (
        <Card>
          <CardTitle icon="🔄">Positions Being Moved (Rollovers)</CardTitle>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>Big players are closing their position at one strike and reopening at another</div>
          {rolls.map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
              borderBottom: i < rolls.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 12, color: C.purple }}>↔</span>
              <div style={{ flex: 1, fontSize: 12, color: C.text }}>
                {r.side === "CE" ? "Call" : "Put"} position moved from{" "}
                <b style={{ color: C.red }}>{r.from}</b> → <b style={{ color: C.green }}>{r.to}</b>
              </div>
              <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 4, background: "#1a0a1a", color: C.purple, border: `1px solid ${C.purple}40` }}>
                ROLLOVER
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* ── Volume conviction ── */}
      <Card>
        <CardTitle icon="📊">Volume Check — Real vs Noise</CardTitle>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { label: "✓ REAL MOVES — Volume confirms the position", zones: highConvZones, color: C.green, bg: C.greenBg, style: {} },
            { label: "⚠ POSSIBLE NOISE — Position without matching volume", zones: lowConvNoise, color: C.muted, bg: C.surface2, style: { border: C.border } },
          ].map(({ label, zones, color, bg }) => (
            <div key={label} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 9, color, marginBottom: 5 }}>{label}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {zones.length
                  ? zones.map((s) => (
                    <span key={s} style={{ background: bg, border: `1px solid ${color}40`, color, padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{s}</span>
                  ))
                  : <span style={{ fontSize: 10, color: C.muted }}>None detected</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── OI Concentration ── */}
      <Card>
        <CardTitle icon="📈">Where the Money Is Concentrated</CardTitle>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { title: `Top Call positions — ${concCe.toFixed(1)}% of all Calls are here`, color: C.red, items: top3Ce, maxOI: maxCeOI, side: "CE" },
            { title: `Top Put positions — ${concPe.toFixed(1)}% of all Puts are here`,  color: C.green, items: top3Pe, maxOI: maxPeOI, side: "PE" },
          ].map(({ title, color, items, maxOI, side }) => (
            <div key={side} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color, marginBottom: 6 }}>{title}</div>
              {items.map((r, i) => (
                <div key={r.strikePrice} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                    <span style={{ color: C.text }}>Strike {r.strikePrice}</span>
                    <span style={{ color }}>{fmt(r[side].openInterest)}</span>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${(r[side].openInterest / maxOI) * 100}%`, height: "100%", background: i === 0 ? color : `${color}66`, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Call Positions (Net)", val: rows.reduce((s, r) => s + r.CE.changeinOpenInterest, 0),
              up: "More Calls being added — sellers expect a ceiling", dn: "Calls being removed — resistance weakening", upC: C.red, dnC: C.green },
            { label: "Put Positions (Net)",  val: rows.reduce((s, r) => s + r.PE.changeinOpenInterest, 0),
              up: "More Puts being added — buyers building a floor",  dn: "Puts being removed — support weakening",    upC: C.green, dnC: C.red },
          ].map(({ label, val, up, dn, upC, dnC }) => (
            <div key={label} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: val >= 0 ? upC : dnC }}>
                {val >= 0 ? "+" : ""}{fmt(val)}
              </div>
              <div style={{ fontSize: 10, color: val >= 0 ? upC : dnC }}>{val >= 0 ? up : dn}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});
