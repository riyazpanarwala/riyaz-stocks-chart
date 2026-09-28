import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { getFinanceDataAction } from "../../app/actions/finance";

// Hook to detect dark/light theme and return adaptive chart colors
function useThemePalette() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const update = () => {
      if (typeof document === "undefined") return;
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "dark";
      setIsDark(currentTheme !== "light");
    };

    update();

    window.addEventListener("themechange", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.removeEventListener("themechange", update);
      observer.disconnect();
    };
  }, []);

  return isDark
    ? {
        grid: "rgba(255, 255, 255, 0.08)",
        axis: "#7a82a0",
        revenue: "#38bdf8",
        profit: "#22c55e",
        operating: "#eab308",
        gross: "#00cff7",
        ebitda: "#c084fc",
      }
    : {
        grid: "rgba(0, 0, 0, 0.08)",
        axis: "#64748b",
        revenue: "#0284c7",
        profit: "#059669",
        operating: "#d97706",
        gross: "#0369a1",
        ebitda: "#7c3aed",
      };
}

// Custom Tooltip for Revenue & Profit
const RevenueProfitTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="trends-tooltip">
      <div className="trends-tooltip-title">{label || data?.periodLabel}</div>
      <div className="trends-tooltip-row">
        <span className="val-accent">Revenue:</span>
        <b>
          {data?.revenueCr != null
            ? `₹${Number(data.revenueCr).toLocaleString("en-IN")} Cr`
            : "N/A"}
        </b>
      </div>
      {data?.revenueGrowthPct != null && (
        <div className="trends-tooltip-sub">
          Growth:{" "}
          <span className={data.revenueGrowthPct >= 0 ? "badge-up" : "badge-down"}>
            {data.revenueGrowthPct >= 0 ? "+" : ""}
            {data.revenueGrowthPct}%
          </span>
        </div>
      )}
      <div className="trends-tooltip-row" style={{ marginTop: 4 }}>
        <span className="val-warn">Operating Profit:</span>
        <b>
          {data?.operatingIncomeCr != null
            ? `₹${Number(data.operatingIncomeCr).toLocaleString("en-IN")} Cr`
            : "N/A"}
        </b>
      </div>
      <div className="trends-tooltip-row">
        <span className="val-bull">Net Profit:</span>
        <b>
          {data?.netIncomeCr != null
            ? `₹${Number(data.netIncomeCr).toLocaleString("en-IN")} Cr`
            : "N/A"}
        </b>
      </div>
      {data?.netIncomeGrowthPct != null && (
        <div className="trends-tooltip-sub">
          Profit Growth:{" "}
          <span className={data.netIncomeGrowthPct >= 0 ? "badge-up" : "badge-down"}>
            {data.netIncomeGrowthPct >= 0 ? "+" : ""}
            {data.netIncomeGrowthPct}%
          </span>
        </div>
      )}
      {data?.eps != null && (
        <div className="trends-tooltip-row" style={{ marginTop: 4 }}>
          <span style={{ color: "var(--tx-second)" }}>EPS:</span>
          <b>₹{data.eps}</b>
        </div>
      )}
    </div>
  );
};

// Custom Tooltip for Margins
const MarginsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="trends-tooltip">
      <div className="trends-tooltip-title">{label || data?.periodLabel}</div>
      {data?.operatingMarginPct != null && (
        <div className="trends-tooltip-row">
          <span className="val-warn">Operating Margin:</span>
          <b>{data.operatingMarginPct}%</b>
        </div>
      )}
      {data?.netMarginPct != null && (
        <div className="trends-tooltip-row">
          <span className="val-bull">Net Profit Margin:</span>
          <b>{data.netMarginPct}%</b>
        </div>
      )}
      {data?.grossMarginPct != null && (
        <div className="trends-tooltip-row">
          <span className="val-accent">Gross Margin:</span>
          <b>{data.grossMarginPct}%</b>
        </div>
      )}
      {data?.ebitdaMarginPct != null && (
        <div className="trends-tooltip-row">
          <span style={{ color: "var(--accent)" }}>EBITDA Margin:</span>
          <b>{data.ebitdaMarginPct}%</b>
        </div>
      )}
    </div>
  );
};

const HistoricalTrends = ({ symbol }) => {
  const colors = useThemePalette();
  const [periodType, setPeriodType] = useState("quarterly"); // "quarterly" | "annual"
  const [viewMode, setViewMode] = useState("revenue"); // "revenue" | "margins" | "table"
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchHistorical() {
      if (!symbol) {
        setData([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const result = await getFinanceDataAction({
          symbol,
          isHistoricalFinancials: true,
          financialsType: periodType,
        });

        if (isMounted) {
          if (Array.isArray(result)) {
            setData(result);
          } else if (result?.error) {
            setError(result.error);
            setData([]);
          } else {
            setData([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load financial trends.");
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchHistorical();

    return () => {
      isMounted = false;
    };
  }, [symbol, periodType]);

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="trends-container">
      {/* Controls Header */}
      <div className="trends-controls">
        <div className="trends-period-toggle">
          <button
            type="button"
            className={`trends-btn ${periodType === "quarterly" ? "active" : ""}`}
            onClick={() => setPeriodType("quarterly")}
          >
            Quarterly (QoQ)
          </button>
          <button
            type="button"
            className={`trends-btn ${periodType === "annual" ? "active" : ""}`}
            onClick={() => setPeriodType("annual")}
          >
            Annual (YoY)
          </button>
        </div>

        <div className="trends-view-toggle">
          <button
            type="button"
            className={`trends-view-btn ${viewMode === "revenue" ? "active" : ""}`}
            onClick={() => setViewMode("revenue")}
          >
            Revenue & Profit
          </button>
          <button
            type="button"
            className={`trends-view-btn ${viewMode === "margins" ? "active" : ""}`}
            onClick={() => setViewMode("margins")}
          >
            Margins (%)
          </button>
          <button
            type="button"
            className={`trends-view-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            Statement Table
          </button>
        </div>
      </div>

      {/* Quick Summary Highlights for Latest Period */}
      {latest && !loading && (
        <div className="trends-summary-cards">
          <div className="trends-summary-card">
            <span className="summary-label">
              Latest Revenue ({latest.periodLabel})
            </span>
            <div className="summary-val-wrap">
              <span className="summary-val">
                {latest.revenueCr != null
                  ? `₹${Number(latest.revenueCr).toLocaleString("en-IN")} Cr`
                  : "N/A"}
              </span>
              {latest.revenueGrowthPct != null && (
                <span
                  className={`growth-badge ${
                    latest.revenueGrowthPct >= 0 ? "up" : "down"
                  }`}
                >
                  {latest.revenueGrowthPct >= 0 ? "+" : ""}
                  {latest.revenueGrowthPct}%
                </span>
              )}
            </div>
          </div>

          <div className="trends-summary-card">
            <span className="summary-label">
              Latest Net Profit
            </span>
            <div className="summary-val-wrap">
              <span className="summary-val val-bull">
                {latest.netIncomeCr != null
                  ? `₹${Number(latest.netIncomeCr).toLocaleString("en-IN")} Cr`
                  : "N/A"}
              </span>
              {latest.netIncomeGrowthPct != null && (
                <span
                  className={`growth-badge ${
                    latest.netIncomeGrowthPct >= 0 ? "up" : "down"
                  }`}
                >
                  {latest.netIncomeGrowthPct >= 0 ? "+" : ""}
                  {latest.netIncomeGrowthPct}%
                </span>
              )}
            </div>
          </div>

          <div className="trends-summary-card">
            <span className="summary-label">Operating Margin (OPM)</span>
            <span className="summary-val val-warn">
              {latest.operatingMarginPct != null ? `${latest.operatingMarginPct}%` : "N/A"}
            </span>
          </div>

          <div className="trends-summary-card">
            <span className="summary-label">Net Profit Margin (NPM)</span>
            <span className="summary-val val-accent">
              {latest.netMarginPct != null ? `${latest.netMarginPct}%` : "N/A"}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="trends-chart-card">
        {loading ? (
          <div className="trends-loader">
            <div className="spinner" />
            <span>Loading historical financial statements...</span>
          </div>
        ) : error ? (
          <div className="trends-empty">{error}</div>
        ) : data.length === 0 ? (
          <div className="trends-empty">
            No historical statements available for this symbol.
          </div>
        ) : viewMode === "revenue" ? (
          <div className="chart-wrapper">
            <div className="chart-title">
              Topline Revenue vs Bottomline Profit Trend (₹ Crores)
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={data}
                margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="periodLabel"
                  stroke={colors.axis}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={colors.axis}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) =>
                    val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                  }
                />
                <Tooltip content={<RevenueProfitTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="revenueCr"
                  name="Revenue (₹ Cr)"
                  fill={colors.revenue}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="netIncomeCr"
                  name="Net Profit (₹ Cr)"
                  fill={colors.profit}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Line
                  type="monotone"
                  dataKey="operatingIncomeCr"
                  name="Operating Profit (₹ Cr)"
                  stroke={colors.operating}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.operating }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : viewMode === "margins" ? (
          <div className="chart-wrapper">
            <div className="chart-title">
              Profitability Margin Curves (%)
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={data}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={colors.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="periodLabel"
                  stroke={colors.axis}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={colors.axis}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<MarginsTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  iconType="circle"
                />
                {data.some((d) => d.grossMarginPct != null) && (
                  <Line
                    type="monotone"
                    dataKey="grossMarginPct"
                    name="Gross Margin (%)"
                    stroke={colors.gross}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="operatingMarginPct"
                  name="Operating Margin (%)"
                  stroke={colors.operating}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="netMarginPct"
                  name="Net Margin (%)"
                  stroke={colors.profit}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                {data.some((d) => d.ebitdaMarginPct != null) && (
                  <Line
                    type="monotone"
                    dataKey="ebitdaMarginPct"
                    name="EBITDA Margin (%)"
                    stroke={colors.ebitda}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={{ r: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Statement Table View */
          <div className="trends-table-wrap">
            <table className="trends-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Revenue (₹ Cr)</th>
                  <th>Growth</th>
                  <th>Operating Pft (₹ Cr)</th>
                  <th>Net Profit (₹ Cr)</th>
                  <th>OPM %</th>
                  <th>NPM %</th>
                  <th>EPS (₹)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    <td className="bold">{row.periodLabel}</td>
                    <td>
                      {row.revenueCr != null
                        ? Number(row.revenueCr).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      {row.revenueGrowthPct != null ? (
                        <span
                          className={`growth-pill ${
                            row.revenueGrowthPct >= 0 ? "up" : "down"
                          }`}
                        >
                          {row.revenueGrowthPct >= 0 ? "+" : ""}
                          {row.revenueGrowthPct}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {row.operatingIncomeCr != null
                        ? Number(row.operatingIncomeCr).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="val-bull bold">
                      {row.netIncomeCr != null
                        ? Number(row.netIncomeCr).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      {row.operatingMarginPct != null
                        ? `${row.operatingMarginPct}%`
                        : "—"}
                    </td>
                    <td>
                      {row.netMarginPct != null ? `${row.netMarginPct}%` : "—"}
                    </td>
                    <td className="mono">
                      {row.eps != null ? `₹${row.eps}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="trends-footnote">
          Data source: Yahoo Finance / S&P Global (Consolidated statements). All currency figures in ₹ Crores.
        </div>
      </div>
    </div>
  );
};

export default HistoricalTrends;
