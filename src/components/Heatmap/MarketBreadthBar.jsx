// src/components/Heatmap/MarketBreadthBar.jsx
"use client";

import React from "react";
import { FiTrendingUp, FiTrendingDown, FiActivity, FiLayers } from "react-icons/fi";

export default function MarketBreadthBar({ breadth, benchmark }) {
  if (!breadth) return null;

  const {
    totalStocks = 0,
    advances = 0,
    declines = 0,
    unchanged = 0,
    advancesPct = 0,
    declinesPct = 0,
    unchangedPct = 0,
    adRatio = 1,
    above50Pct = 0,
    above200Pct = 0,
    above50Count = 0,
    above200Count = 0,
    near52WHighCount = 0,
    near52WLowCount = 0,
    netNewHighs = 0,
    breadthRegime = "Neutral",
    regimeColor = "neutral",
  } = breadth;

  const nifty50 = benchmark?.nifty50;
  const isNiftyUp = (nifty50?.changePercent ?? 0) >= 0;

  return (
    <section className="market-breadth-section" aria-label="Market Breadth Overview">
      {/* ── Top Bar: Regime & Macro Benchmark Summary ── */}
      <div className="breadth-header-row">
        <div className="breadth-title-group">
          <div className="section-badge">
            <FiActivity className="icon" />
            <span>Market Breadth Engine</span>
          </div>
          <span className={`regime-badge ${regimeColor}`}>
            {breadthRegime}
          </span>
        </div>

        {nifty50 && (
          <div className="benchmark-chip">
            <span className="label">NIFTY 50:</span>
            <span className="price">{nifty50.price?.toLocaleString("en-IN")}</span>
            <span className={`change ${isNiftyUp ? "positive" : "negative"}`}>
              {isNiftyUp ? "+" : ""}{nifty50.changePercent?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Visual Advance / Decline Segmented Progress Bar ── */}
      <div className="ad-bar-container">
        <div className="ad-bar-track">
          <div
            className="ad-bar-segment advances"
            style={{ width: `${Math.max(advancesPct, 5)}%` }}
            title={`Advances: ${advances} stocks (${advancesPct}%)`}
          >
            {advancesPct >= 12 && <span>▲ {advances} ({advancesPct}%)</span>}
          </div>

          {unchangedPct > 0 && (
            <div
              className="ad-bar-segment unchanged"
              style={{ width: `${unchangedPct}%` }}
              title={`Unchanged: ${unchanged} stocks (${unchangedPct}%)`}
            >
              {unchangedPct >= 6 && <span>— {unchanged}</span>}
            </div>
          )}

          <div
            className="ad-bar-segment declines"
            style={{ width: `${Math.max(declinesPct, 5)}%` }}
            title={`Declines: ${declines} stocks (${declinesPct}%)`}
          >
            {declinesPct >= 12 && <span>▼ {declines} ({declinesPct}%)</span>}
          </div>
        </div>

        <div className="ad-bar-legend">
          <span className="legend-item advances">
            <span className="dot" />
            <strong>{advances}</strong> Advancing ({advancesPct}%)
          </span>
          <span className="legend-item unchanged">
            <span className="dot" />
            <strong>{unchanged}</strong> Unchanged
          </span>
          <span className="legend-item declines">
            <span className="dot" />
            <strong>{declines}</strong> Declining ({declinesPct}%)
          </span>
        </div>
      </div>

      {/* ── Four Quantitative Metric Cards ── */}
      <div className="breadth-cards-grid">
        {/* Card 1: Advance / Decline Ratio */}
        <div className="breadth-card">
          <div className="card-top">
            <span className="card-label">Advance / Decline Ratio</span>
            <span className={`ratio-pill ${adRatio >= 1.5 ? "bullish" : adRatio <= 0.6 ? "bearish" : "neutral"}`}>
              {adRatio >= 1 ? "Bullish Bias" : "Bearish Bias"}
            </span>
          </div>
          <div className="card-value-row">
            <span className="main-metric">{adRatio}</span>
            <span className="metric-subtext">
              {advances} adv / {declines} dec
            </span>
          </div>
          <p className="card-hint">
            Ratio of gaining to losing equities across {totalStocks} liquid market leaders.
          </p>
        </div>

        {/* Card 2: 50-Day Moving Average Health */}
        <div className="breadth-card">
          <div className="card-top">
            <span className="card-label">Stocks Above 50 DMA</span>
            <span className="ratio-pill info">Intermediate Trend</span>
          </div>
          <div className="card-value-row">
            <span className="main-metric">{above50Pct}%</span>
            <span className="metric-subtext">{above50Count} / {totalStocks}</span>
          </div>
          <div className="mini-progress-bar">
            <div
              className={`mini-fill ${above50Pct >= 50 ? "positive" : "negative"}`}
              style={{ width: `${above50Pct}%` }}
            />
          </div>
          <p className="card-hint">
            {above50Pct >= 50
              ? "Over half of constituents in sustained medium-term uptrends."
              : "Consolidation or correction below 50-day average."}
          </p>
        </div>

        {/* Card 3: 200-Day Moving Average Health */}
        <div className="breadth-card">
          <div className="card-top">
            <span className="card-label">Stocks Above 200 DMA</span>
            <span className="ratio-pill info">Macro Health</span>
          </div>
          <div className="card-value-row">
            <span className="main-metric">{above200Pct}%</span>
            <span className="metric-subtext">{above200Count} / {totalStocks}</span>
          </div>
          <div className="mini-progress-bar">
            <div
              className={`mini-fill ${above200Pct >= 50 ? "positive" : "negative"}`}
              style={{ width: `${above200Pct}%` }}
            />
          </div>
          <p className="card-hint">
            {above200Pct >= 60
              ? "Strong structural bull market backing broad universe."
              : "Defensive posture; selective stock picking required."}
          </p>
        </div>

        {/* Card 4: 52-Week High / Low Balance */}
        <div className="breadth-card">
          <div className="card-top">
            <span className="card-label">52-Week High / Low Balance</span>
            <span className={`ratio-pill ${netNewHighs >= 0 ? "bullish" : "bearish"}`}>
              Net {netNewHighs >= 0 ? `+${netNewHighs}` : netNewHighs}
            </span>
          </div>
          <div className="card-value-row">
            <div className="high-low-split">
              <span className="split-high">
                <FiTrendingUp /> {near52WHighCount} Highs
              </span>
              <span className="divider">/</span>
              <span className="split-low">
                <FiTrendingDown /> {near52WLowCount} Lows
              </span>
            </div>
          </div>
          <div className="mini-progress-bar">
            <div
              className="mini-fill positive"
              style={{
                width: `${(near52WHighCount + near52WLowCount > 0)
                  ? (near52WHighCount / (near52WHighCount + near52WLowCount)) * 100
                  : 50}%`
              }}
            />
          </div>
          <p className="card-hint">
            Stocks trading within 3% of their respective 52-week extremes.
          </p>
        </div>
      </div>
    </section>
  );
}
