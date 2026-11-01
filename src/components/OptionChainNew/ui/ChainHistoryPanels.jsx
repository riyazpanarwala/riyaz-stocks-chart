import React, { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { C } from "../constants.js";

const WINDOWS = [15, 30, 60];
const PANEL = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 };
const control = { background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 8px", fontFamily: "inherit", fontSize: 10 };

function useWindowData(snapshots, minutes, now) {
  return useMemo(() => {
    const cutoff = now - minutes * 60_000;
    return (snapshots ?? []).filter((item) => Number.isFinite(item.ts) && item.ts >= cutoff && item.ts <= now)
      .sort((a, b) => a.ts - b.ts);
  }, [snapshots, minutes, now]);
}

function HistoryControls({ minutes, setMinutes, strike, setStrike, strikes }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {WINDOWS.map((value) => <button key={value} onClick={() => setMinutes(value)} aria-pressed={minutes === value}
          style={{ ...control, cursor: "pointer", color: minutes === value ? C.blue : C.muted, borderColor: minutes === value ? `${C.blue}88` : C.border }}>
          {value} min
        </button>)}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 7, color: C.muted, fontSize: 10 }}>
        Strike
        <select value={strike} onChange={(event) => setStrike(Number(event.target.value))} style={control}>
          {strikes.map((value) => <option key={value} value={value}>{Number(value).toLocaleString("en-IN")}</option>)}
        </select>
      </label>
    </div>
  );
}

function HistoryChart({ data, yLabel, formatter, zeroLine = false }) {
  if (data.length < 2) return <div style={{ height: 230, display: "grid", placeItems: "center", color: C.muted, fontSize: 11, textAlign: "center" }}>
    Not enough snapshots yet. Keep the page open during market hours while the option chain refreshes.
  </div>;
  return <ResponsiveContainer width="100%" height={250}>
    <LineChart data={data} margin={{ top: 8, right: 14, left: 4, bottom: 4 }}>
      <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
      <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 9 }} minTickGap={28} />
      <YAxis tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={formatter} width={58} />
      <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 10 }}
        labelStyle={{ color: C.muted }} formatter={(value, name) => [formatter(value), name]} />
      {zeroLine && <ReferenceLine y={0} stroke={C.muted} strokeDasharray="4 4" />}
      <Line type="monotone" dataKey="ce" name="Call" stroke={C.green} strokeWidth={2} dot={false} connectNulls={false} />
      <Line type="monotone" dataKey="pe" name="Put" stroke={C.red} strokeWidth={2} dot={false} connectNulls={false} />
    </LineChart>
  </ResponsiveContainer>;
}

function strikeList(rows, atm) {
  const values = (rows ?? []).map((row) => row.strikePrice).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return [];
  return values.slice(Math.max(0, values.indexOf(atm) - 5), Math.max(0, values.indexOf(atm) - 5) + 11);
}

export const OITimeline = React.memo(function OITimeline({ snapshots = [], rows = [], atm, now = Date.now() }) {
  const [minutes, setMinutes] = useState(15);
  const strikes = useMemo(() => strikeList(rows, atm), [rows, atm]);
  const [selectedStrike, setSelectedStrike] = useState(null);
  const strike = strikes.includes(selectedStrike) ? selectedStrike : (strikes.includes(atm) ? atm : strikes[0]);
  const windowData = useWindowData(snapshots, minutes, now);
  const data = useMemo(() => {
    const points = windowData.map((snapshot) => {
      const row = snapshot.rows?.find((item) => item.strikePrice === strike);
      return { ts: snapshot.ts, label: new Date(snapshot.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), ceOi: Number(row?.CE?.openInterest), peOi: Number(row?.PE?.openInterest) };
    }).filter((item) => Number.isFinite(item.ceOi) && Number.isFinite(item.peOi));
    const baseline = points[0];
    return baseline ? points.map((item) => ({ ...item, ce: item.ceOi - baseline.ceOi, pe: item.peOi - baseline.peOi })) : [];
  }, [windowData, strike]);
  const last = data.at(-1);
  const fmt = (value) => `${Number(value) > 0 ? "+" : ""}${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return <section style={PANEL} aria-label="Open Interest Change Timeline">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <div><strong style={{ fontSize: 13, color: C.text }}>OI Change Timeline</strong><div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Call and put OI change from the first captured snapshot in the selected window.</div></div>
      <span style={{ fontSize: 9, color: C.muted }}>{windowData.length} snapshots · updates with chain refresh</span>
    </div>
    <HistoryControls minutes={minutes} setMinutes={setMinutes} strike={strike} setStrike={setSelectedStrike} strikes={strikes} />
    <HistoryChart data={data} yLabel="OI change" formatter={fmt} zeroLine />
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 10, marginTop: 5 }}>
      <span style={{ color: C.green }}>Call ΔOI <b>{last ? fmt(last.ce) : "—"}</b></span>
      <span style={{ color: C.red }}>Put ΔOI <b>{last ? fmt(last.pe) : "—"}</b></span>
      <span style={{ color: C.muted }}>OI change alone does not identify long/short positioning.</span>
    </div>
  </section>;
});

export const IVChangeTracker = React.memo(function IVChangeTracker({ snapshots = [], rows = [], atm, now = Date.now() }) {
  const [minutes, setMinutes] = useState(15);
  const strikes = useMemo(() => strikeList(rows, atm), [rows, atm]);
  const [selectedStrike, setSelectedStrike] = useState(null);
  const strike = strikes.includes(selectedStrike) ? selectedStrike : (strikes.includes(atm) ? atm : strikes[0]);
  const windowData = useWindowData(snapshots, minutes, now);
  const data = useMemo(() => windowData.map((snapshot) => {
    const row = snapshot.rows?.find((item) => item.strikePrice === strike);
    const ce = Number(row?.CE?.impliedVolatility), pe = Number(row?.PE?.impliedVolatility);
    return { ts: snapshot.ts, label: new Date(snapshot.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), ce: Number.isFinite(ce) && ce > 0 ? ce : null, pe: Number.isFinite(pe) && pe > 0 ? pe : null };
  }).filter((item) => item.ce != null || item.pe != null), [windowData, strike]);
  const first = data[0], last = data.at(-1);
  const fmt = (value) => `${Number(value).toFixed(2)}%`;
  const change = (side) => first && last && first[side] != null && last[side] != null ? last[side] - first[side] : null;
  const fmtChange = (value) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)} pp`;

  return <section style={PANEL} aria-label="Implied Volatility Change Tracker">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <div><strong style={{ fontSize: 13, color: C.text }}>IV Change Tracker</strong><div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Call and put implied volatility at the selected strike, captured over time.</div></div>
      <span style={{ fontSize: 9, color: C.muted }}>{windowData.length} snapshots · updates with chain refresh</span>
    </div>
    <HistoryControls minutes={minutes} setMinutes={setMinutes} strike={strike} setStrike={setSelectedStrike} strikes={strikes} />
    <HistoryChart data={data} yLabel="IV (%)" formatter={fmt} />
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 10, marginTop: 5 }}>
      <span style={{ color: C.green }}>Call IV change <b>{fmtChange(change("ce"))}</b></span>
      <span style={{ color: C.red }}>Put IV change <b>{fmtChange(change("pe"))}</b></span>
      <span style={{ color: C.muted }}>Changes are percentage points; stale or unavailable IV values are omitted.</span>
    </div>
  </section>;
});
