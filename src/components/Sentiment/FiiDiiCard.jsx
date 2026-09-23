// src/components/Sentiment/FiiDiiCard.jsx
"use client";

import React from "react";
import { FiTrendingUp, FiTrendingDown, FiShield, FiDollarSign } from "react-icons/fi";

/**
 * Format currency in Indian numbering format with Cr suffix.
 * @param {number} val - Value in Crores.
 * @returns {string} Formatted string.
 */
function formatCr(val) {
  const num = Number(val) || 0;
  const sign = num > 0 ? "+" : "";
  return `${sign}₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
}

/**
 * FiiDiiCard - Displays daily Foreign and Domestic Institutional Cash Market investments,
 * gross buying/selling volumes, net investment breakdown, and institutional sentiment bias.
 *
 * @param {object} props
 * @param {object} props.fiiDii - Formatted FII/DII data object from macroSentimentService.
 * @returns {JSX.Element|null}
 */
export default function FiiDiiCard({ fiiDii }) {
  if (!fiiDii) return null;

  const { date, fii, dii, stance } = fiiDii;
  const combinedNet = (fii?.net || 0) + (dii?.net || 0);
  const isCombinedNetPositive = combinedNet >= 0;

  // Calculate buy vs sell volume ratios for visual bars
  const fiiTotal = (fii?.buy || 0) + (fii?.sell || 0) || 1;
  const fiiBuyPct = Math.round(((fii?.buy || 0) / fiiTotal) * 100);
  const fiiSellPct = 100 - fiiBuyPct;

  const diiTotal = (dii?.buy || 0) + (dii?.sell || 0) || 1;
  const diiBuyPct = Math.round(((dii?.buy || 0) / diiTotal) * 100);
  const diiSellPct = 100 - diiBuyPct;

  return (
    <div className="macro-card fii-dii-card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-badge fii-icon">
            <FiDollarSign />
          </div>
          <div>
            <h3>FII & DII Institutional Activity</h3>
            <span className="card-subtitle">NSE Cash Market Daily Flows • {date}</span>
          </div>
        </div>

        {stance && (
          <div className={`stance-badge ${stance.badgeColor || "neutral"}`}>
            <FiShield className="badge-icon" />
            <span>{stance.stance}</span>
          </div>
        )}
      </div>

      {stance?.summary && (
        <div className="stance-summary-box">
          <p>{stance.summary}</p>
        </div>
      )}

      {/* ── Key Summary Grid: FII Net, DII Net, Combined Net ── */}
      <div className="institutional-kpi-grid">
        <div className={`kpi-box ${fii?.net >= 0 ? "positive" : "negative"}`}>
          <span className="kpi-label">FII / FPI Net Cash</span>
          <div className="kpi-value-row">
            {fii?.net >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
            <span className="kpi-value">{formatCr(fii?.net)}</span>
          </div>
          <div className="kpi-subtext">
            Buy: ₹{fii?.buy?.toLocaleString("en-IN")} Cr | Sell: ₹{fii?.sell?.toLocaleString("en-IN")} Cr
          </div>
          {/* FII Progress Bar */}
          <div className="volume-ratio-bar" title={`FII Buy: ${fiiBuyPct}% | Sell: ${fiiSellPct}%`}>
            <div className="bar-buy" style={{ width: `${fiiBuyPct}%` }} />
            <div className="bar-sell" style={{ width: `${fiiSellPct}%` }} />
          </div>
        </div>

        <div className={`kpi-box ${dii?.net >= 0 ? "positive" : "negative"}`}>
          <span className="kpi-label">DII Domestic Net Cash</span>
          <div className="kpi-value-row">
            {dii?.net >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
            <span className="kpi-value">{formatCr(dii?.net)}</span>
          </div>
          <div className="kpi-subtext">
            Buy: ₹{dii?.buy?.toLocaleString("en-IN")} Cr | Sell: ₹{dii?.sell?.toLocaleString("en-IN")} Cr
          </div>
          {/* DII Progress Bar */}
          <div className="volume-ratio-bar" title={`DII Buy: ${diiBuyPct}% | Sell: ${diiSellPct}%`}>
            <div className="bar-buy" style={{ width: `${diiBuyPct}%` }} />
            <div className="bar-sell" style={{ width: `${diiSellPct}%` }} />
          </div>
        </div>

        <div className={`kpi-box combined ${isCombinedNetPositive ? "positive" : "negative"}`}>
          <span className="kpi-label">Total Institutional Net</span>
          <div className="kpi-value-row">
            {isCombinedNetPositive ? <FiTrendingUp /> : <FiTrendingDown />}
            <span className="kpi-value">{formatCr(combinedNet)}</span>
          </div>
          <div className="kpi-subtext">
            Bias: <strong>{stance?.bias || "Neutral"}</strong>
          </div>
          <div className="volume-ratio-bar combined">
            <div
              className={`bar-fill ${isCombinedNetPositive ? "fill-buy" : "fill-sell"}`}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
