// ═══════════════════════════════════════════════════════════════
// CHART COMPONENTS
// OIChart · DeltaOIChart · ChartTooltip
// ═══════════════════════════════════════════════════════════════
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from "recharts";
import { C } from "../constants.js";

// ─── Shared tooltip ───────────────────────────────────────────

export const ChartTip = React.memo(function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "8px 12px", fontSize: 11,
    }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>
        Strike <b style={{ color: C.text }}>{label}</b>
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <b>{(p.value / 1000).toFixed(1)}K</b>
        </p>
      ))}
    </div>
  );
});

// ─── OI Chart ─────────────────────────────────────────────────

export const OIChart = React.memo(function OIChart({ chartData, atm, maxPain, sig }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: "12px 8px", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, paddingLeft: 4 }}>
        Call vs Put open positions · ATM (nearest strike):{" "}
        <b style={{ color: C.blue }}>{atm}</b>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="15%" margin={{ left: -15, right: 4 }}>
          <XAxis dataKey="strike" tick={{ fill: C.muted, fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={38} />
          <Tooltip content={<ChartTip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine x={atm}     stroke={C.blue}   strokeDasharray="4 3" label={{ value: "ATM",      fill: C.blue,   fontSize: 9 }} />
          <ReferenceLine x={maxPain} stroke={C.yellow} strokeDasharray="4 3" label={{ value: "Max Pain", fill: C.yellow, fontSize: 9 }} />

          <Bar dataKey="Call OI">
            {chartData.map((e, i) => (
              <Cell key={i}
                fill={sig?.topResistance.includes(e.strike) ? C.red : e.isATM ? "#ff7b72" : "#3a1a1a"}
                opacity={sig?.topResistance.includes(e.strike) ? 1 : 0.75}
              />
            ))}
          </Bar>
          <Bar dataKey="Put OI">
            {chartData.map((e, i) => (
              <Cell key={i}
                fill={sig?.topSupport.includes(e.strike) ? C.green : e.isATM ? "#56d364" : C.greenBg}
                opacity={sig?.topSupport.includes(e.strike) ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ─── ΔOI Chart ────────────────────────────────────────────────

export const DeltaOIChart = React.memo(function DeltaOIChart({ chartData, atm }) {
  const highActivity = chartData
    .filter((r) => Math.abs(r["CE ΔOI"]) > 300 || Math.abs(r["PE ΔOI"]) > 300)
    .slice(0, 5);

  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: "12px 8px", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, paddingLeft: 4 }}>
        Change in open positions since yesterday · Positive = new positions added
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={chartData} barCategoryGap="15%" margin={{ left: -15, right: 4 }}>
          <XAxis dataKey="strike" tick={{ fill: C.muted, fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={38} />
          <Tooltip content={<ChartTip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine y={0} stroke={C.border} />
          <ReferenceLine x={atm} stroke={C.blue} strokeDasharray="4 3" />
          <Bar dataKey="CE ΔOI">
            {chartData.map((e, i) => <Cell key={i} fill={e["CE ΔOI"] >= 0 ? C.red   : C.green} opacity={0.85} />)}
          </Bar>
          <Bar dataKey="PE ΔOI">
            {chartData.map((e, i) => <Cell key={i} fill={e["PE ΔOI"] >= 0 ? C.green : C.red}   opacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {highActivity.length > 0 && (
        <div style={{ marginTop: 8, paddingLeft: 4 }}>
          <div style={{ fontSize: 9, color: C.yellow, marginBottom: 4 }}>⚡ High Activity Strikes</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {highActivity.map((r) => (
              <span key={r.strike} style={{
                background: "#1c1400", border: `1px solid ${C.yellow}40`,
                color: C.yellow, padding: "2px 7px", borderRadius: 4, fontSize: 10,
              }}>
                {r.strike} {Math.abs(r["PE ΔOI"]) > Math.abs(r["CE ΔOI"]) ? "🟢 Puts active" : "🔴 Calls active"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
