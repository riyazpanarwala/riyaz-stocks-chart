import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Access the raw data from the payload
    const d = payload[0].payload;

    return (
      <div
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.98)",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "14px",
          minWidth: "260px",
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

        {/* Call Option Section */}
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
              fontSize: "12px",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
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
            <span>Total OI:</span>
            <span style={{ color: "#fff", fontWeight: "500" }}>
              {d.callOI}L
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              marginTop: "4px",
            }}
          >
            <span style={{ color: "#94a3b8" }}>Change OI:</span>
            <span style={{ color: "#ef4444", fontWeight: "bold" }}>
              {d.callChange > 0 ? `+${d.callChange}` : d.callChange}L
            </span>
          </div>
        </div>

        {/* Put Option Section */}
        <div
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.08)",
            padding: "10px",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              color: "#22c55e",
              fontWeight: "bold",
              fontSize: "12px",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
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
            <span>Total OI:</span>
            <span style={{ color: "#fff", fontWeight: "500" }}>{d.putOI}L</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              marginTop: "4px",
            }}
          >
            <span style={{ color: "#94a3b8" }}>Change OI:</span>
            <span style={{ color: "#22c55e", fontWeight: "bold" }}>
              {d.putChange > 0 ? `+${d.putChange}` : d.putChange}L
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const OIChart = ({ data = [], meta = {} }) => {
  if (!data || data.length === 0) return null;

  // Pre-calculate the base (Total - Change) so the stack height reflects the actual Total OI
  const chartData = data.map((d) => ({
    ...d,
    putBase: Math.max(0, d.putOI - d.putChange),
    callBase: Math.max(0, d.callOI - d.callChange),
  }));

  return (
    <div
      style={{
        height: 450,
        width: "100%",
        background: "#050505",
        padding: "25px",
        borderRadius: "12px",
        fontFamily: "sans-serif",
      }}
    >
      <ResponsiveContainer width="100%" height="420">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
          barGap={4}
        >
          <defs>
            <pattern
              id="stripesCall"
              width="4"
              height="3"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="1.5" fill="#ef4444" fillOpacity="0.9" />
            </pattern>
            <pattern
              id="stripesPut"
              width="4"
              height="3"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="1.5" fill="#22c55e" fillOpacity="0.9" />
            </pattern>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1a1a1a"
            vertical={false}
          />

          <XAxis
            dataKey="strike"
            stroke="#555"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />

          <YAxis
            stroke="#555"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}L`}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            allowEscapeViewBox={{ x: true, y: true }}
          />

          <ReferenceLine
            x={meta.atmStrike}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            label={{
              value: "ATM",
              fill: "#3b82f6",
              fontSize: 11,
              position: "top",
              fontWeight: "bold",
            }}
          />

          {/* Put Column (Stacked) */}
          <Bar dataKey="putBase" stackId="put" fill="#14532d" barSize={18} />
          <Bar
            dataKey="putChange"
            stackId="put"
            fill="url(#stripesPut)"
            barSize={18}
          />

          {/* Call Column (Stacked) */}
          <Bar dataKey="callBase" stackId="call" fill="#7f1d1d" barSize={18} />
          <Bar
            dataKey="callChange"
            stackId="call"
            fill="url(#stripesCall)"
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OIChart;
