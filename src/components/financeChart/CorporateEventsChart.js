"use client";
import React from "react";
import { GenericChartComponent } from "@riyazpanarwala/core";

export default class CorporateEventsChart extends React.Component {
  constructor(props) {
    super(props);
    this.renderSVG = this.renderSVG.bind(this);
  }

  renderSVG(moreProps) {
    const { xAccessor, xScale, chartConfig, plotData } = moreProps;
    if (!plotData || !chartConfig || !this.props.enabled) return null;

    const { yScale, height } = chartConfig;
    const { onSelectEvent } = this.props;

    // Filter points in current plotData that contain corporate action events
    const eventsData = plotData.filter((d) => d && (d.dividend || d.split));
    if (!eventsData.length) return null;

    const badgeY = Math.max(20, height - 16);
    const radius = 9;

    return (
      <g className="react-financial-charts-corporate-events" style={{ pointerEvents: "all" }}>
        {eventsData.map((d, idx) => {
          const xPos = xScale(xAccessor(d));
          if (!Number.isFinite(xPos)) return null;

          const hasDividend = Boolean(d.dividend);
          const hasSplit = Boolean(d.split);
          const candleLowY = yScale(d.low);

          const dateStr = d.date ? String(d.date).split(" ")[0] : "";

          // Offset horizontally if both events occur on the same day
          const divX = hasDividend && hasSplit ? xPos - 10 : xPos;
          const splitX = hasDividend && hasSplit ? xPos + 10 : xPos;

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
                        date: dateStr,
                        amount: d.dividend.amount,
                        close: d.close,
                        datum: d,
                      });
                    }
                  }}
                >
                  <title>{`💰 Dividend: ₹${Number(d.dividend.amount).toFixed(2)}\n📅 Ex-Date: ${dateStr}\n(Click to view details)`}</title>
                  {/* Subtle glow / outer stroke */}
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
                        date: dateStr,
                        ratio: d.split.splitRatio || `${d.split.numerator}:${d.split.denominator}`,
                        close: d.close,
                        datum: d,
                      });
                    }
                  }}
                >
                  <title>{`✂️ Stock Split: ${d.split.splitRatio || `${d.split.numerator}:${d.split.denominator}`}\n📅 Ex-Date: ${dateStr}\n(Click to view details)`}</title>
                  {/* Subtle glow / outer stroke */}
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
