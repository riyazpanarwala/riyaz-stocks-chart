"use client";
import React from "react";
import { GenericChartComponent } from "@riyazpanarwala/core";

/**
 * Extracts a formatted YYYY-MM-DD date string from an event object or fallback.
 *
 * @param {object} evt - Corporate action event object
 * @param {string} fallback - Fallback date string
 * @returns {string} Clean date string
 */
function getEventDate(evt, fallback) {
  if (evt && evt.date) {
    return String(evt.date).split("T")[0].split(" ")[0];
  }
  return fallback || "";
}

/**
 * CorporateEventsChart renders visual badges for corporate action events
 * (Dividends and Stock Splits) on the financial candlestick chart.
 *
 * Each badge is positioned along the baseline below the corresponding candle,
 * connected by a vertical dashed stem, with native tooltips and click handling.
 */
export default class CorporateEventsChart extends React.Component {
  constructor(props) {
    super(props);
    this.renderSVG = this.renderSVG.bind(this);
  }

  /**
   * Renders SVG badges and guidelines for visible corporate action points.
   *
   * @param {object} moreProps - Chart canvas context properties
   * @returns {React.ReactElement|null} SVG element group
   */
  renderSVG(moreProps) {
    const { xAccessor, xScale, chartConfig, plotData } = moreProps;
    if (!plotData || !chartConfig || !this.props.enabled) return null;

    const { yScale, height } = chartConfig;
    const { onSelectEvent } = this.props;

    // Filter points in current plotData that contain corporate action events
    const eventsData = plotData.filter(
      (d) =>
        d &&
        (d.dividend ||
          d.split ||
          (d.dividends && d.dividends.length > 0) ||
          (d.splits && d.splits.length > 0))
    );
    if (!eventsData.length) return null;

    const badgeY = Math.max(20, height - 16);
    const radius = 9;

    return (
      <g className="react-financial-charts-corporate-events" style={{ pointerEvents: "all" }}>
        {eventsData.map((d, idx) => {
          const xPos = xScale(xAccessor(d));
          if (!Number.isFinite(xPos)) return null;

          const candleDividends = d.dividends || (d.dividend ? [d.dividend] : []);
          const candleSplits = d.splits || (d.split ? [d.split] : []);

          const hasDividend = candleDividends.length > 0;
          const hasSplit = candleSplits.length > 0;
          const candleLowY = yScale(d.low);

          const candleDateStr = d.date ? String(d.date).split(" ")[0] : "";
          const divDate = getEventDate(candleDividends[0], candleDateStr);
          const splitDate = getEventDate(candleSplits[0], candleDateStr);

          // Offset horizontally if both events occur on the same day
          const divX = hasDividend && hasSplit ? xPos - 10 : xPos;
          const splitX = hasDividend && hasSplit ? xPos + 10 : xPos;

          const divTooltip =
            candleDividends.length > 1
              ? `💰 Dividends (${candleDividends.length}):\n` +
                candleDividends
                  .map(
                    (dv) =>
                      `  • ₹${Number(dv.amount).toFixed(2)} (Ex: ${getEventDate(
                        dv,
                        candleDateStr
                      )})`
                  )
                  .join("\n") +
                "\n(Click to view details)"
              : `💰 Dividend: ₹${Number(candleDividends[0].amount).toFixed(
                  2
                )}\n📅 Ex-Date: ${divDate}\n(Click to view details)`;

          const splitTooltip =
            candleSplits.length > 1
              ? `✂️ Stock Splits (${candleSplits.length}):\n` +
                candleSplits
                  .map(
                    (sp) =>
                      `  • ${
                        sp.splitRatio || `${sp.numerator}:${sp.denominator}`
                      } (Ex: ${getEventDate(sp, candleDateStr)})`
                  )
                  .join("\n") +
                "\n(Click to view details)"
              : `✂️ Stock Split: ${
                  candleSplits[0].splitRatio ||
                  `${candleSplits[0].numerator}:${candleSplits[0].denominator}`
                }\n📅 Ex-Date: ${splitDate}\n(Click to view details)`;

          return (
            <g key={`event-${d.date}-${idx}`} className="corporate-event-group">
              {/* Dotted guideline from candle low down to badge baseline */}
              {Number.isFinite(candleLowY) && candleLowY < badgeY - radius && (
                <line
                  x1={xPos}
                  y1={candleLowY + 2}
                  x2={xPos}
                  y2={badgeY - radius - 2}
                  stroke={hasSplit ? "#8b5cf6" : "#10b981"}
                  strokeDasharray="2,2"
                  strokeWidth={1}
                  opacity={0.45}
                />
              )}

              {/* Dividend Badge */}
              {hasDividend && (
                <g
                  className="corporate-badge dividend-badge"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEvent) {
                      onSelectEvent({
                        type: "dividend",
                        date: divDate,
                        amount: candleDividends[0].amount,
                        events: candleDividends,
                        close: d.close,
                        datum: d,
                      });
                    }
                  }}
                >
                  <title>{divTooltip}</title>
                  <circle
                    cx={divX}
                    cy={badgeY}
                    r={radius}
                    fill="#10b981"
                    stroke="#064e3b"
                    strokeWidth={1.2}
                  />
                  <text
                    x={divX}
                    y={badgeY + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={9.5}
                    fontWeight="800"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    D
                  </text>
                </g>
              )}

              {/* Stock Split Badge */}
              {hasSplit && (
                <g
                  className="corporate-badge split-badge"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectEvent) {
                      onSelectEvent({
                        type: "split",
                        date: splitDate,
                        ratio:
                          candleSplits[0].splitRatio ||
                          `${candleSplits[0].numerator}:${candleSplits[0].denominator}`,
                        events: candleSplits,
                        close: d.close,
                        datum: d,
                      });
                    }
                  }}
                >
                  <title>{splitTooltip}</title>
                  <circle
                    cx={splitX}
                    cy={badgeY}
                    r={radius}
                    fill="#8b5cf6"
                    stroke="#4c1d95"
                    strokeWidth={1.2}
                  />
                  <text
                    x={splitX}
                    y={badgeY + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={9.5}
                    fontWeight="800"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    S
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  render() {
    return (
      <GenericChartComponent
        svgDraw={this.renderSVG}
        drawOn={["pan", "mousemove"]}
      />
    );
  }
}

CorporateEventsChart.defaultProps = {
  enabled: true,
};
