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

const OIChart = ({ data, meta, showChange }) => {
  const chartData = data.map((d) => ({
    strike: d.strike,

    put: showChange ? d.putChange : d.putOI,
    call: showChange ? d.callChange : d.callOI,
  }));

  return (
    <div
      style={{
        height: 420,
        background: "#111827",
        padding: 10,
        borderRadius: 12,
      }}
    >
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid stroke="#222" />

          <XAxis dataKey="strike" />

          <YAxis />

          <Tooltip />

          <Legend />

          <ReferenceLine x={meta.atmStrike} stroke="#3b82f6" />

          <Bar dataKey="put" fill="#7ddc6f" barSize={28} name="Put OI" />

          <Bar dataKey="call" fill="#ff4d4f" barSize={28} name="Call OI" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OIChart;
