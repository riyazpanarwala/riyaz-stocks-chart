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
  Legend,
} from "recharts";

const OIChart = ({ data = [], meta = {}, showChange = false }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    strike: d.strike,
    put: showChange ? d.putChange : d.putOI,
    call: showChange ? d.callChange : d.callOI,
  }));

  const labelSuffix = showChange ? " Change" : " OI";

  return (
    <div
      style={{
        height: 420,
        width: "100%",
        background: "#0f172a", // Slightly deeper navy
        padding: "20px 10px",
        borderRadius: 12,
        border: "1px solid #1e293b",
      }}
    >
      <ResponsiveContainer width="100%" height="400">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />

          <XAxis
            dataKey="strike"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />

          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
            }
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "none",
              borderRadius: "8px",
              color: "#f8fafc",
            }}
            itemStyle={{ fontSize: "12px" }}
            cursor={{ fill: "#334155", opacity: 0.4 }}
          />

          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: "20px" }}
          />

          {/* Highlight the At-The-Money (ATM) Strike */}
          {meta.atmStrike && (
            <ReferenceLine
              x={meta.atmStrike}
              stroke="#fbbf24"
              strokeDasharray="5 5"
              label={{
                position: "top",
                value: "ATM",
                fill: "#fbbf24",
                fontSize: 10,
              }}
            />
          )}

          <Bar
            dataKey="put"
            fill="#22c55e"
            name={`Put${labelSuffix}`}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="call"
            fill="#ef4444"
            name={`Call${labelSuffix}`}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OIChart;
