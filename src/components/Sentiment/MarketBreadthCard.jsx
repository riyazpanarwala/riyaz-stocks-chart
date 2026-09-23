// src/components/Sentiment/MarketBreadthCard.jsx
"use client";

import React from "react";
import { FiLayers, FiBarChart2, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

/**
 * MarketBreadthCard - Displays multi-index advance/decline distribution (Nifty 50, 500, Midcap 100),
 * moving average (50 & 200 DMA) participation gauges, and broad market health status.
 *
 * @param {object} props
 * @param {Array<object>} props.benchmarks - Multi-index breadth benchmark data.
 * @param {object} props.dmaBreadth - Moving average breadth stats.
 * @returns {JSX.Element|null}
 */
export default function MarketBreadthCard({ benchmarks = [], dmaBreadth = {} }) {
  const {
    above50Pct = 0,
    above200Pct = 0,
    above50Count = 0,
    above200Count = 0,
    totalStocks = 0,
    breadthRegime = "Neutral",
    regimeColor = "neutral",
  } = dmaBreadth;

  return (
    <div className="macro-card market-breadth-card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-badge breadth-icon">
            <FiBarChart2 />
          </div>
          <div>
            <h3>Market Breadth 2.0 & DMA Participation</h3>
            <span className="card-subtitle">Multi-Index Advance/Decline & Moving Average Distribution</span>
          </div>
        </div>

        <div className={`stance-badge ${regimeColor}`}>
          <span className="dot" />
          <span>{breadthRegime} Regime</span>
        </div>
      </div>

      {/* ── 50 & 200 DMA Moving Average Health Gauges ── */}
      <div className="dma-gauges-container">
        <div className="dma-gauge-box">
          <div className="dma-gauge-top">
            <span className="dma-label">Universe Above 50 DMA (Medium-Term Health)</span>
            <span className="dma-pct">{above50Pct}%</span>
          </div>
          <div className="dma-progress-track">
            <div
              className={`dma-progress-fill ${above50Pct >= 50 ? "bullish" : "bearish"}`}
              style={{ width: `${above50Pct}%` }}
            />
          </div>
          <div className="dma-subtext">
            <span>{above50Count} of {totalStocks} core constituents in uptrend</span>
            <span className="zone-hint">{above50Pct >= 60 ? "Strong Momentum" : above50Pct <= 40 ? "Weak Breadth" : "Neutral"}</span>
          </div>
        </div>

        <div className="dma-gauge-box">
          <div className="dma-gauge-top">
            <span className="dma-label">Universe Above 200 DMA (Long-Term Structural Bull)</span>
            <span className="dma-pct">{above200Pct}%</span>
          </div>
          <div className="dma-progress-track">
            <div
              className={`dma-progress-fill ${above200Pct >= 50 ? "bullish" : "bearish"}`}
              style={{ width: `${above200Pct}%` }}
            />
          </div>
          <div className="dma-subtext">
            <span>{above200Count} of {totalStocks} core constituents in macro bull</span>
            <span className="zone-hint">{above200Pct >= 60 ? "Macro Bullish" : above200Pct <= 40 ? "Structural Weakness" : "Selective"}</span>
          </div>
        </div>
      </div>

      {/* ── Multi-Index Advance / Decline Benchmarks Table ── */}
      <div className="benchmarks-table-wrapper">
        <table className="benchmarks-table">
          <thead>
            <tr>
              <th>Index Benchmark</th>
              <th>Last Price</th>
              <th>Daily Change</th>
              <th>Advances / Declines</th>
              <th>A/D Ratio</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((idx) => {
              const isUp = idx.percentChange >= 0;
              return (
                <tr key={idx.symbol || idx.label}>
                  <td className="index-name-cell">
                    <span className="index-icon">{idx.icon}</span>
                    <strong>{idx.label}</strong>
                  </td>
                  <td className="price-cell">
                    {idx.last?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`change-cell ${isUp ? "positive" : "negative"}`}>
                    {isUp ? "+" : ""}{idx.percentChange?.toFixed(2)}%
                  </td>
                  <td className="ad-counts-cell">
                    <span className="adv-text">▲ {idx.advances}</span>
                    <span className="separator">/</span>
                    <span className="dec-text">▼ {idx.declines}</span>
                  </td>
                  <td className="ratio-cell">
                    <span className={`ratio-badge ${idx.adRatio >= 1.5 ? "positive" : idx.adRatio <= 0.7 ? "negative" : "neutral"}`}>
                      {idx.adRatio}x
                    </span>
                  </td>
                  <td className="distribution-cell">
                    <div className="mini-ad-bar" title={`Advances: ${idx.advancesPct}% | Declines: ${idx.declinesPct}%`}>
                      <div className="mini-ad-adv" style={{ width: `${idx.advancesPct}%` }} />
                      <div className="mini-ad-dec" style={{ width: `${idx.declinesPct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
