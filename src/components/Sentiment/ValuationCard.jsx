// src/components/Sentiment/ValuationCard.jsx
"use client";

import React from "react";
import { FiPieChart, FiInfo, FiTrendingUp } from "react-icons/fi";

/**
 * ValuationCard - Displays NIFTY 50 fundamental valuation multiples
 * (Price to Earnings, Price to Book, Dividend Yield) alongside historical reference benchmarks.
 *
 * @param {object} props
 * @param {object} props.valuation - Valuation object containing pe, pb, dy, status, and badgeColor.
 * @returns {JSX.Element|null}
 */
export default function ValuationCard({ valuation }) {
  if (!valuation) return null;

  const { pe = 0, pb = 0, dy = 0, status = "Fair Value", badgeColor = "info" } = valuation;

  return (
    <div className="macro-card valuation-card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-badge valuation-icon">
            <FiPieChart />
          </div>
          <div>
            <h3>NIFTY 50 Valuation Snapshot</h3>
            <span className="card-subtitle">Fundamental Multiples & Historical Median Benchmarks</span>
          </div>
        </div>

        <div className={`stance-badge ${badgeColor}`}>
          <span className="dot" />
          <span>{status}</span>
        </div>
      </div>

      <div className="valuation-multiples-grid">
        <div className="valuation-item">
          <span className="val-label">Trailing P/E Ratio</span>
          <span className="val-number">{pe > 0 ? pe.toFixed(2) : "—"}</span>
          <span className="val-subtext">Historical Median: ~20.5x</span>
        </div>

        <div className="valuation-item">
          <span className="val-label">Price-to-Book (P/B)</span>
          <span className="val-number">{pb > 0 ? pb.toFixed(2) : "—"}</span>
          <span className="val-subtext">Historical Range: 2.8x - 4.2x</span>
        </div>

        <div className="valuation-item">
          <span className="val-label">Dividend Yield (DY)</span>
          <span className="val-number">{dy > 0 ? `${dy.toFixed(2)}%` : "—"}</span>
          <span className="val-subtext">Historical Mean: ~1.20%</span>
        </div>
      </div>

      <div className="valuation-context-box">
        <FiInfo className="info-icon" />
        <p>
          Historical Nifty 50 P/E below 18 represents attractive long-term accumulation zones; P/E between 18 and 23 indicates fair value; and P/E above 26 indicates rich valuations prone to consolidation.
        </p>
      </div>
    </div>
  );
}
