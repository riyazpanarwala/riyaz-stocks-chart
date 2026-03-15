import React, { useMemo } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Line,
  Bar,
  ComposedChart,
} from "recharts";

// --- Helper for Number Safety ---
const safeNum = (val) => (isNaN(val) ? 0 : val);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const netOI = (safeNum(d.putOI) - safeNum(d.callOI)).toFixed(1);
    const isBullish = netOI > 0;

    return (
      <div
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.98)",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "14px",
          minWidth: "240px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "bold",
            marginBottom: "12px",
            borderBottom: "1px solid #222",
            paddingBottom: "8px",
          }}
        >
          Strike: {label}
        </div>

        {/* Call Section */}
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              color: "#ef4444",
              fontWeight: "bold",
              fontSize: "11px",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          >
            Call Option
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            <span>Total: {safeNum(d.callOI).toFixed(1)}L</span>
            <span style={{ color: d.callChange >= 0 ? "#ef4444" : "#888" }}>
              Chg: {d.callChange > 0 ? `+${d.callChange}` : d.callChange}L
            </span>
          </div>
        </div>

        {/* Put Section */}
        <div
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.08)",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              color: "#22c55e",
              fontWeight: "bold",
              fontSize: "11px",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          >
            Put Option
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            <span>Total: {safeNum(d.putOI).toFixed(1)}L</span>
            <span style={{ color: d.putChange >= 0 ? "#22c55e" : "#888" }}>
              Chg: {d.putChange > 0 ? `+${d.putChange}` : d.putChange}L
            </span>
          </div>
        </div>

        {/* Net OI Info */}
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            padding: "5px",
            borderRadius: "4px",
            background: isBullish
              ? "rgba(34, 197, 94, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
          }}
        >
          <span style={{ color: "#fff" }}>Net OI: </span>
          <span
            style={{
              color: isBullish ? "#22c55e" : "#ef4444",
              fontWeight: "bold",
            }}
          >
            {isBullish ? `+${netOI}` : netOI}L
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const OIChart = ({ data = [], meta = {}, timeStamp }) => {
  // Memoize data transformation for performance
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d) => {
      const callOI = safeNum(d.callOI);
      const putOI = safeNum(d.putOI);
      const callChange = safeNum(d.callChange);
      const putChange = safeNum(d.putChange);

      // Logic Improvement: Handle Unwinding vs Buildup
      // If change is positive, split the bar (Base + Change).
      // If change is negative, show only the current OI to avoid visual glitches.
      const isCallBuildup = callChange > 0;
      const isPutBuildup = putChange > 0;

      return {
        ...d,
        callOI,
        putOI,
        // Visual Logic
        callBase: isCallBuildup ? Math.max(0, callOI - callChange) : callOI,
        callChangeVisual: isCallBuildup ? callChange : 0,

        putBase: isPutBuildup ? Math.max(0, putOI - putChange) : putOI,
        putChangeVisual: isPutBuildup ? putChange : 0,

        netOI: putOI - callOI,
      };
    });
  }, [data]);

  if (!data || data.length === 0) return null;

  const sentiment =
    meta.PCR > 1 ? "Bullish" : meta.PCR < 0.8 ? "Bearish" : "Neutral";

  return (
    <div style={{ height: 550, width: "100%", background: "transparent" }}>
      {/* Legend / Stats Header - Added flexWrap for responsiveness */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "20px",
          borderBottom: "1px solid #1a1a1a",
          paddingBottom: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            SPOT:{" "}
            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
              {meta.spotPrice}
            </span>
          </div>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            PCR:{" "}
            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
              {meta.PCR?.toFixed(2)}
            </span>
          </div>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            Sentiment:{" "}
            <span
              style={{
                color:
                  sentiment === "Bullish"
                    ? "#22c55e"
                    : sentiment === "Bearish"
                      ? "#ef4444"
                      : "#3b82f6",
                fontWeight: "bold",
              }}
            >
              {sentiment}
            </span>
          </div>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            ATM: <span style={{ color: "#3b82f6" }}>{meta.atmStrike}</span>
          </div>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            Support:{" "}
            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
              {meta.support?.join(", ")}
            </span>
          </div>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            Resistance:{" "}
            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
              {meta.resistance?.join(", ")}
            </span>
          </div>
          <div style={{ color: "#fff", fontSize: "13px" }}>
            Max Pain:{" "}
            <span style={{ color: "#facc15", fontWeight: "bold" }}>
              {meta.maxPainStrike}
            </span>
          </div>
        </div>
        <div
          style={{
            color: "#555",
            fontSize: "11px",
            textAlign: "right",
          }}
        >
          Last Updated: {timeStamp}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
          barGap={4}
        >
          <defs>
            <pattern
              id="stripesCall"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="2" fill="#ef4444" fillOpacity="0.9" />
            </pattern>
            <pattern
              id="stripesPut"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="2" fill="#22c55e" fillOpacity="0.9" />
            </pattern>
          </defs>

          {/* Performance: Disable animation for grid/lines */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1a1a1a"
            vertical={false}
          />
          <XAxis
            dataKey="strike"
            stroke="#555"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
          />

          <YAxis
            stroke="#555"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}L`}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            allowEscapeViewBox={{ x: false, y: false }}
          />

          <ReferenceLine y={0} stroke="#333" strokeWidth={1} />

          {/* Reference Lines with isAnimationActive={false} */}
          <ReferenceLine
            x={meta.atmStrike}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            isAnimationActive={false}
            label={{
              value: "ATM",
              fill: "#3b82f6",
              fontSize: 10,
              position: "top",
              fontWeight: "bold",
            }}
          />

          <ReferenceLine
            x={meta.maxPainStrike}
            stroke="#facc15"
            strokeWidth={2}
            isAnimationActive={false}
            label={{
              value: "MAX PAIN",
              fill: "#facc15",
              fontSize: 10,
              position: "top",
              fontWeight: "bold",
            }}
          />

          {/* Put Bars */}
          <Bar
            dataKey="putBase"
            stackId="put"
            fill="#14532d"
            barSize={14}
            isAnimationActive={false}
          />
          <Bar
            dataKey="putChangeVisual"
            stackId="put"
            fill="url(#stripesPut)"
            barSize={14}
            isAnimationActive={false}
          />

          {/* Call Bars */}
          <Bar
            dataKey="callBase"
            stackId="call"
            fill="#7f1d1d"
            barSize={14}
            isAnimationActive={false}
          />
          <Bar
            dataKey="callChangeVisual"
            stackId="call"
            fill="url(#stripesCall)"
            barSize={14}
            isAnimationActive={false}
          />

          {/* Net OI Line */}
          <Line
            type="monotone"
            dataKey="netOI"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OIChart;
