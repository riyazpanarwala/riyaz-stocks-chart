// ═══════════════════════════════════════════════════════════════
// MAX PAIN & PCR (PUT-CALL RATIO) TREND TRACKER
// ═══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { C } from "../constants.js";
import { useMaxPainPcrTrend } from "../hooks/useMaxPainPcrTrend.js";
import { fmtK } from "../utils/formatters.js";

// ─── Custom Tooltip for Dual-Axis Trend ──────────────────────────────
const TrendChartTooltip = React.memo(function TrendChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ color: C.muted, marginBottom: 4, fontWeight: 600 }}>
        Time: <span style={{ color: C.text }}>{label}</span>
      </div>
      {payload.map((p, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            color: p.color || C.text,
            margin: "2px 0",
          }}
        >
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {p.dataKey === "spot"
              ? `₹${Number(p.value).toLocaleString("en-IN")}`
              : Number(p.value).toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
});

// ─── Custom Tooltip for Max Pain Loss Curve ─────────────────────────
const LossCurveTooltip = React.memo(function LossCurveTooltip({
  active,
  payload,
  label,
  maxPain,
}) {
  if (!active || !payload?.length) return null;
  const isMaxPain = Number(label) === maxPain;

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${isMaxPain ? C.yellow : C.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ color: isMaxPain ? C.yellow : C.muted, fontWeight: 700, marginBottom: 4 }}>
        Strike {label} {isMaxPain ? "★ (MAX PAIN)" : ""}
      </div>
      {payload.map((p, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            color: p.color || C.text,
            margin: "2px 0",
          }}
        >
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {fmtK(p.value)} pts
          </span>
        </div>
      ))}
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════
// MAIN TRACKER COMPONENT
// ═════════════════════════════════════════════════════════════════════
export const MaxPainPcrTracker = React.memo(function MaxPainPcrTracker({
  instrument,
  activeExpiry,
  rows,
  fullOI,
  isIndex,
  underlyingValue,
  atm,
  pcr,
  maxPain,
  fetchedAt,
}) {
  const {
    snapshots,
    rawSnapshotsCount,
    trendMetrics,
    pcrSentiment,
    volPcr,
    maxPainCurve,
    maxPainCalculated,
    clearHistory,
  } = useMaxPainPcrTrend({
    instrument,
    activeExpiry,
    rows,
    fullOI,
    isIndex,
    underlyingValue,
    atm,
    pcr,
    maxPain,
    fetchedAt,
  });

  const activeMaxPain = maxPain || maxPainCalculated || atm;

  // Filter loss curve to 12 strikes above and below ATM for clean display
  const displayLossCurve = useMemo(() => {
    if (!maxPainCurve || maxPainCurve.length === 0) return [];
    const targetAtm = atm || underlyingValue;
    if (!targetAtm) return maxPainCurve.slice(0, 25);

    const sorted = [...maxPainCurve].sort((a, b) => a.strike - b.strike);
    const atmIndex = sorted.findIndex((s) => s.strike >= targetAtm);
    const centerIdx = atmIndex >= 0 ? atmIndex : Math.floor(sorted.length / 2);

    const start = Math.max(0, centerIdx - 12);
    const end = Math.min(sorted.length, centerIdx + 13);
    return sorted.slice(start, end);
  }, [maxPainCurve, atm, underlyingValue]);

  // Min and max for Spot Y-Axis in Dual Trend chart
  const spotDomain = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return ["auto", "auto"];
    const spots = snapshots.map((s) => s.spot).filter((s) => s > 0);
    if (!spots.length) return ["auto", "auto"];
    const min = Math.min(...spots);
    const max = Math.max(...spots);
    const pad = Math.max((max - min) * 0.15, 10);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [snapshots]);

  // Min and max for PCR Y-Axis
  const pcrDomain = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [0.5, 1.5];
    const pcrs = snapshots.map((s) => s.pcr).filter((p) => p > 0);
    if (!pcrs.length) return [0.5, 1.5];
    const min = Math.min(...pcrs, 0.7);
    const max = Math.max(...pcrs, 1.3);
    const pad = Math.max((max - min) * 0.15, 0.05);
    return [Number((min - pad).toFixed(2)), Number((max + pad).toFixed(2))];
  }, [snapshots]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
      {/* ─── 1. TOP METRIC TILES ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
        }}
      >
        {/* Metric 1: Open Interest PCR */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Open Interest PCR
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: pcrSentiment.color }}>
              {Number(pcr).toFixed(2)}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                background: `${pcrSentiment.color}22`,
                color: pcrSentiment.color,
                border: `1px solid ${pcrSentiment.color}44`,
              }}
            >
              {pcrSentiment.label}
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.3 }}>
            {pcrSentiment.description}
          </div>
        </div>

        {/* Metric 2: Volume PCR */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Volume PCR vs OI PCR
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: volPcr > 1.1 ? C.green : volPcr < 0.9 ? C.red : C.yellow,
              }}
            >
              {Number.isFinite(volPcr) && volPcr > 0 ? Number(volPcr).toFixed(2) : "—"}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>
              OI PCR: <b style={{ color: C.text }}>{Number(pcr).toFixed(2)}</b>
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {Number.isFinite(volPcr) && volPcr > pcr ? (
              <span style={{ color: C.green }}>
                ↑ Volume PCR exceeds OI PCR (Fresh Put buying/writing intraday)
              </span>
            ) : Number.isFinite(volPcr) && volPcr < pcr ? (
              <span style={{ color: C.red }}>
                ↓ Volume PCR lagging OI PCR (Active Call churn/buying intraday)
              </span>
            ) : (
              <span>Balanced volume & open interest ratio</span>
            )}
          </div>
        </div>

        {/* Metric 3: Max Pain Strike */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Max Pain Strike
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: C.yellow }}>
              {activeMaxPain || "—"}
            </span>
            {trendMetrics.gravityPull && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: trendMetrics.gravityPull.distancePts > 0 ? C.red : C.green,
                }}
              >
                {trendMetrics.gravityPull.distancePts > 0
                  ? `+${trendMetrics.gravityPull.distancePts} pts`
                  : `${trendMetrics.gravityPull.distancePts} pts`}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {trendMetrics.gravityPull ? (
              <span>
                Spot (₹{underlyingValue.toLocaleString("en-IN")}) is{" "}
                <b style={{ color: C.text }}>
                  {Math.abs(trendMetrics.gravityPull.distancePts)} pts (
                  {Math.abs(trendMetrics.gravityPull.distancePct)}%)
                </b>{" "}
                {trendMetrics.gravityPull.distancePts >= 0 ? "above" : "below"} Max Pain.
              </span>
            ) : (
              "Calculated from full strike chain."
            )}
          </div>
        </div>

        {/* Metric 4: Intraday Trend Velocity */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Intraday PCR Velocity
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color:
                  trendMetrics.direction === "Rising"
                    ? C.green
                    : trendMetrics.direction === "Falling"
                    ? C.red
                    : C.yellow,
              }}
            >
              {trendMetrics.direction === "Rising"
                ? `↑ +${trendMetrics.pcrChange}`
                : trendMetrics.direction === "Falling"
                ? `↓ ${trendMetrics.pcrChange}`
                : `→ ${trendMetrics.pcrChange >= 0 ? `+${trendMetrics.pcrChange}` : trendMetrics.pcrChange}`}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>
              {trendMetrics.direction}
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {trendMetrics.velocityPerHour !== 0 ? (
              <span>
                Velocity:{" "}
                <b style={{ color: C.text }}>
                  {trendMetrics.velocityPerHour > 0 ? `+` : ""}
                  {trendMetrics.velocityPerHour} / hr
                </b>
              </span>
            ) : (
              <span>Tracking session snapshots in memory</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. DIVERGENCE / MIGRATION BANNER ─────────────────────────── */}
      {trendMetrics.divergence && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background:
              trendMetrics.divergence.severity === "positive"
                ? "#0d2a16"
                : trendMetrics.divergence.severity === "warning"
                ? "#2a0d0d"
                : C.surface2,
            border: `1px solid ${
              trendMetrics.divergence.severity === "positive"
                ? C.green
                : trendMetrics.divergence.severity === "warning"
                ? C.red
                : C.blue
            }`,
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color:
                  trendMetrics.divergence.severity === "positive"
                    ? C.green
                    : trendMetrics.divergence.severity === "warning"
                    ? C.red
                    : C.blue,
              }}
            >
              {trendMetrics.divergence.title}
            </div>
            <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>
              {trendMetrics.divergence.message}
            </div>
          </div>
          {trendMetrics.maxPainMigration && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 4,
                background: C.surface,
                border: `1px solid ${C.border}`,
                color: C.yellow,
              }}
            >
              {trendMetrics.maxPainMigration.label}
            </span>
          )}
        </motion.div>
      )}

      {/* ─── 3. CHART 1: INTRADAY SPOT VS PCR DUAL-AXIS TREND ─────────── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              📈 Intraday Spot Price vs Put-Call Ratio (PCR) Trend
            </span>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Left Axis (Cyan): Spot Price (₹) · Right Axis (Gold): OI Put-Call Ratio
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.blue }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue }} />
              Spot Price
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.yellow }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.yellow }} />
              OI PCR
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.purple }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple }} />
              Volume PCR
            </span>
          </div>
        </div>

        {snapshots.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={snapshots} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" opacity={0.6} />
              <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 9 }} />

              {/* Left Y-Axis: Spot Price */}
              <YAxis
                yAxisId="spot"
                orientation="left"
                domain={spotDomain}
                tick={{ fill: C.blue, fontSize: 9 }}
                tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
                width={56}
              />

              {/* Right Y-Axis: PCR */}
              <YAxis
                yAxisId="pcr"
                orientation="right"
                domain={pcrDomain}
                tick={{ fill: C.yellow, fontSize: 9 }}
                tickFormatter={(v) => Number(v).toFixed(2)}
                width={36}
              />

              <Tooltip content={<TrendChartTooltip />} />

              {/* Reference Bands for Sentiment Zones */}
              <ReferenceLine yAxisId="pcr" y={1.2} stroke={C.green} strokeDasharray="3 3" strokeOpacity={0.6} />
              <ReferenceLine yAxisId="pcr" y={1.0} stroke={C.muted} strokeDasharray="2 2" strokeOpacity={0.5} />
              <ReferenceLine yAxisId="pcr" y={0.8} stroke={C.red} strokeDasharray="3 3" strokeOpacity={0.6} />

              <Line
                yAxisId="spot"
                type="monotone"
                dataKey="spot"
                name="Spot Price"
                stroke={C.blue}
                strokeWidth={2}
                dot={{ r: 2, fill: C.blue }}
                activeDot={{ r: 5 }}
              />

              <Line
                yAxisId="pcr"
                type="monotone"
                dataKey="pcr"
                name="OI PCR"
                stroke={C.yellow}
                strokeWidth={2}
                dot={{ r: 2, fill: C.yellow }}
                activeDot={{ r: 5 }}
              />

              <Line
                yAxisId="pcr"
                type="monotone"
                dataKey="volPcr"
                name="Volume PCR"
                stroke={C.purple}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.muted,
              fontSize: 11,
            }}
          >
            Recording live intraday snapshots as data refreshes…
          </div>
        )}
      </div>

      {/* ─── 4. CHART 2: MAX PAIN TOTAL LOSS DISTRIBUTION CURVE ───────── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              🎯 Option Sellers Loss Curve (Max Pain Payoff)
            </span>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Lowest total monetary payout for option writers occurs at strike{" "}
              <b style={{ color: C.yellow }}>{activeMaxPain}</b> (Gold Bar)
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.yellow }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: C.yellow }} />
              Max Pain Strike ({activeMaxPain})
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.blue }}>
              <span style={{ width: 8, height: 2, background: C.blue }} />
              Current Spot (₹{underlyingValue.toLocaleString("en-IN")})
            </span>
          </div>
        </div>

        {displayLossCurve.length > 0 ? (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={displayLossCurve}
              barCategoryGap="18%"
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" opacity={0.6} />
              <XAxis dataKey="strike" tick={{ fill: C.muted, fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: C.muted, fontSize: 9 }}
                tickFormatter={(v) => fmtK(v)}
                width={45}
              />
              <Tooltip
                content={<LossCurveTooltip maxPain={activeMaxPain} />}
              />

              {/* Reference Line for Current Spot Price */}
              <ReferenceLine
                x={atm}
                stroke={C.blue}
                strokeDasharray="4 3"
                label={{ value: "Spot", fill: C.blue, fontSize: 9, position: "top" }}
              />

              <Bar dataKey="totalLoss" name="Total Writer Loss">
                {displayLossCurve.map((entry, index) => {
                  const isMaxPain = entry.strike === activeMaxPain;
                  const isATM = entry.strike === atm;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isMaxPain ? C.yellow : isATM ? "#253b5c" : "#1c2430"}
                      stroke={isMaxPain ? "#ffe79a" : isATM ? C.blue : C.border}
                      strokeWidth={isMaxPain ? 1.5 : 1}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.muted,
              fontSize: 11,
            }}
          >
            No strike loss curve available for this contract.
          </div>
        )}
      </div>

      {/* ─── 5. EXPIRY PLAYBOOK & INSTITUTIONAL GUIDANCE ─────────────── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          🧭 Expiry & Intraday Gravitational Playbook
        </div>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          {trendMetrics.gravityPull?.bias === "Downside Gravity (Towards Max Pain)" && (
            <span>
              Spot is currently floating{" "}
              <b style={{ color: C.red }}>{Math.abs(trendMetrics.gravityPull.distancePts)} points above Max Pain</b>.
              As expiry approaches, option writers have strong financial incentive to cap rallies and induce mean reversion
              downward towards <b style={{ color: C.yellow }}>₹{activeMaxPain}</b> to maximize retained premiums.
            </span>
          )}
          {trendMetrics.gravityPull?.bias === "Upside Gravity (Towards Max Pain)" && (
            <span>
              Spot is currently trading{" "}
              <b style={{ color: C.green }}>{Math.abs(trendMetrics.gravityPull.distancePts)} points below Max Pain</b>.
              Option writers experience heavy losses on Put writes at current depressed prices; gravitational expiry pull favors
              an upward drift or short squeeze towards <b style={{ color: C.yellow }}>₹{activeMaxPain}</b>.
            </span>
          )}
          {trendMetrics.gravityPull?.bias === "Pinned at Max Pain" && (
            <span>
              Spot is currently closely aligned with Max Pain (<b style={{ color: C.yellow }}>₹{activeMaxPain}</b>).
              Expect heightened volatility compression, rangebound price action, and maximum theta decay.
            </span>
          )}
        </div>
      </div>

      {/* ─── 6. SESSION RETENTION & CLEANUP FOOTER ─────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "4px 8px",
          fontSize: 10,
          color: C.muted,
        }}
      >
        <span>
          Session Storage:{" "}
          <b style={{ color: C.text }}>{rawSnapshotsCount} snapshot points</b> recorded today ·
          Auto-pruned after 48 hours.
        </span>

        <button
          onClick={clearHistory}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "4px 8px",
            color: C.muted,
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "inherit",
          }}
          title="Reset intraday trend history for this contract"
        >
          🗑️ Clear Trend History
        </button>
      </div>
    </div>
  );
});
