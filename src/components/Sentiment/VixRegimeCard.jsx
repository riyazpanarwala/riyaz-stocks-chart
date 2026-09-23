// src/components/Sentiment/VixRegimeCard.jsx
"use client";

import React from "react";
import { FiActivity, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

/**
 * VixRegimeCard - Renders the India VIX Volatility Gauge, current regime classification,
 * 52-week high/low band, and actionable trading playbook matrix for equity and option traders.
 *
 * @param {object} props
 * @param {object} props.vix - Formatted VIX object from macroSentimentService.
 * @returns {JSX.Element|null}
 */
export default function VixRegimeCard({ vix }) {
  if (!vix) return null;

  const {
    value = 0,
    change = 0,
    changePercent = 0,
    dayHigh = 0,
    dayLow = 0,
    fiftyTwoWeekHigh = 0,
    fiftyTwoWeekLow = 0,
    regime = {},
  } = vix;

  const isVixUp = change >= 0;

  // Calculate position percentage on 8 - 30 scale for gauge needle
  const MIN_VIX = 8;
  const MAX_VIX = 30;
  const clampedValue = Math.min(Math.max(value, MIN_VIX), MAX_VIX);
  const gaugePercent = Math.round(((clampedValue - MIN_VIX) / (MAX_VIX - MIN_VIX)) * 100);

  // Calculate 52W range progress
  const range52Diff = fiftyTwoWeekHigh - fiftyTwoWeekLow || 1;
  const range52Percent = Math.min(
    100,
    Math.max(0, Math.round(((value - fiftyTwoWeekLow) / range52Diff) * 100))
  );

  return (
    <div className="macro-card vix-regime-card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-badge vix-icon">
            <FiActivity />
          </div>
          <div>
            <h3>India VIX Volatility & Risk Regime</h3>
            <span className="card-subtitle">NSE Volatility Index • Market Fear & Greed Gauge</span>
          </div>
        </div>

        <div className={`stance-badge ${regime.badgeColor || "neutral"}`}>
          <span className="dot" />
          <span>{regime.label || "Normal"}</span>
        </div>
      </div>

      {/* ── VIX Value & 52-Week Range ── */}
      <div className="vix-hero-row">
        <div className="vix-number-box">
          <span className="vix-current-val">{value.toFixed(2)}</span>
          <span className={`vix-change-tag ${isVixUp ? "elevated" : "subdued"}`}>
            {isVixUp ? <FiTrendingUp /> : <FiTrendingDown />}
            {isVixUp ? "+" : ""}{change.toFixed(2)} ({isVixUp ? "+" : ""}{changePercent.toFixed(2)}%)
          </span>
          <span className="vix-range-subtext">Day Range: {dayLow} - {dayHigh}</span>
        </div>

        <div className="vix-52w-box">
          <div className="band-header">
            <span>52-Week Range:</span>
            <strong>{fiftyTwoWeekLow} — {fiftyTwoWeekHigh}</strong>
          </div>
          <div className="band-bar-track">
            <div className="band-bar-fill" style={{ width: `${range52Percent}%` }} />
            <div className="band-marker" style={{ left: `${range52Percent}%` }} title={`Current: ${value}`} />
          </div>
          <div className="band-labels">
            <span>52W Low ({fiftyTwoWeekLow})</span>
            <span>{range52Percent}% of 52W Span</span>
            <span>52W High ({fiftyTwoWeekHigh})</span>
          </div>
        </div>
      </div>

      {/* ── Volatility Gauge Meter ── */}
      <div className="vix-gauge-container">
        <div className="gauge-segments-track">
          <div className="segment segment-low" style={{ width: "18%" }} title="Low Volatility (< 12)">
            <span>Low (&lt;12)</span>
          </div>
          <div className="segment segment-normal" style={{ width: "20%" }} title="Normal Volatility (12 - 16)">
            <span>Normal (12-16)</span>
          </div>
          <div className="segment segment-elevated" style={{ width: "30%" }} title="Elevated Caution (16 - 22)">
            <span>Caution (16-22)</span>
          </div>
          <div className="segment segment-panic" style={{ width: "32%" }} title="Extreme Panic (> 22)">
            <span>Panic (&gt;22)</span>
          </div>
          {/* Needle Indicator */}
          <div
            className="gauge-needle"
            style={{ left: `${gaugePercent}%` }}
            title={`VIX: ${value}`}
          >
            <div className="needle-head" />
            <div className="needle-line" />
          </div>
        </div>
      </div>

      <div className="regime-explanation-box">
        <p>{regime.description}</p>
      </div>

      {/* ── Actionable Trading Playbook Matrix ── */}
      <div className="vix-playbook-grid">
        <div className="playbook-item">
          <div className="playbook-role-badge">📈 Equity & Swing Traders</div>
          <p>{regime.equityAdvice}</p>
        </div>
        <div className="playbook-item">
          <div className="playbook-role-badge">🎯 Option Buyers</div>
          <p>{regime.optionBuyers}</p>
        </div>
        <div className="playbook-item">
          <div className="playbook-role-badge">🛡️ Option Sellers</div>
          <p>{regime.optionSellers}</p>
        </div>
      </div>
    </div>
  );
}
