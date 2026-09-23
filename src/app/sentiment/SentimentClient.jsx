// src/app/sentiment/SentimentClient.jsx
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { FiCompass, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiActivity, FiLayers } from "react-icons/fi";
import FiiDiiCard from "@/components/Sentiment/FiiDiiCard";
import VixRegimeCard from "@/components/Sentiment/VixRegimeCard";
import MarketBreadthCard from "@/components/Sentiment/MarketBreadthCard";
import ValuationCard from "@/components/Sentiment/ValuationCard";
import "./Sentiment.scss";

/**
 * SentimentClient - Interactive client dashboard for Market Sentiment & Macro Indicators.
 *
 * @param {object} props
 * @param {object} props.initialData - Pre-fetched server-rendered macro sentiment data.
 * @returns {JSX.Element}
 */
export default function SentimentClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, startRefreshing] = useTransition();
  const [error, setError] = useState(null);

  const handleRefresh = async () => {
    startRefreshing(async () => {
      try {
        setError(null);
        const res = await fetch("/api/sentiment?refresh=true", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Refresh sentiment error:", err);
        setError("Failed to refresh sentiment data. Please retry.");
      }
    });
  };

  const vix = data?.vix;
  const fiiDii = data?.fiiDii;
  const benchmarks = data?.benchmarks || [];
  const valuation = data?.valuation;
  const dmaBreadth = data?.dmaBreadth;

  // Primary benchmark (NIFTY 500 or NIFTY 50) for top KPI
  const n500 = benchmarks.find((b) => b.label === "NIFTY 500") || benchmarks[0];
  const combinedNet = (fiiDii?.fii?.net || 0) + (fiiDii?.dii?.net || 0);

  return (
    <div className="sentiment-page">
      {/* ── Top Navigation Bar ── */}
      <nav className="sentiment-nav" aria-label="Main Navigation">
        <Link href="/" className="sentiment-brand">
          <h1>
            <FiCompass /> Panarwala Market Sentiment
          </h1>
        </Link>
        <div className="sentiment-nav-links">
          <Link href="/" className="nav-pill-link">
            📈 Interactive Chart
          </Link>
          <Link href="/screener" className="nav-pill-link">
            🔍 Signals Screener
          </Link>
          <Link href="/heatmap" className="nav-pill-link">
            🗺️ Sector Heatmap
          </Link>
          <Link href="/sentiment" className="nav-pill-link active">
            🌐 Market Sentiment
          </Link>
          <Link href="/briefing" className="nav-pill-link">
            🤖 AI Briefing
          </Link>
          <Link href="/optionchain" className="nav-pill-link">
            📊 Option Chain
          </Link>
          <Link href="/TradingView" className="nav-pill-link">
            ⚡ TradingView
          </Link>
        </div>
      </nav>

      {/* ── Main Dashboard Container ── */}
      <main className="sentiment-container">
        {/* Error Notification */}
        {error && (
          <div
            className="error-banner"
            style={{
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* ── Toolbar Header ── */}
        <div className="sentiment-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-title">
              📊 Market Sentiment & Macro Indicators Dashboard
            </span>
            <span className="toolbar-subtext">
              Track institutional cash positioning, India VIX fear gauge, broad market breadth, and valuation multiples.
            </span>
          </div>

          <div className="toolbar-right">
            <div className="live-pulse-badge">
              <span className="pulse-dot" />
              <span>NSE / Yahoo Data {data?.isCached ? "• Cached" : "• Live"}</span>
            </div>

            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Force refresh market data from upstream exchanges"
            >
              <FiRefreshCw className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* ── Top Hero KPI Strip ── */}
        <div className="sentiment-hero-strip">
          {/* India VIX KPI */}
          <div className="hero-kpi-card border-vix">
            <span className="kpi-title">India VIX</span>
            <div className="kpi-main-val">
              {vix?.value ? vix.value.toFixed(2) : "—"}
              <span style={{ fontSize: "0.8rem", color: (vix?.change || 0) >= 0 ? "#f87171" : "#34d399" }}>
                {(vix?.change || 0) >= 0 ? "+" : ""}{vix?.change?.toFixed(2)}
              </span>
            </div>
            <span className={`kpi-status-tag ${vix?.regime?.badgeColor || "neutral"}`}>
              {vix?.regime?.zone || "Normal"} Volatility
            </span>
          </div>

          {/* FII Net KPI */}
          <div className="hero-kpi-card border-fii">
            <span className="kpi-title">FII / FPI Net Cash</span>
            <div className="kpi-main-val">
              ₹{fiiDii?.fii?.net ? Math.abs(fiiDii.fii.net).toLocaleString("en-IN") : "0"} Cr
            </div>
            <span className={`kpi-status-tag ${(fiiDii?.fii?.net || 0) >= 0 ? "positive" : "negative"}`}>
              {(fiiDii?.fii?.net || 0) >= 0 ? "▲ Net Buyer" : "▼ Net Seller"}
            </span>
          </div>

          {/* DII Net KPI */}
          <div className="hero-kpi-card border-dii">
            <span className="kpi-title">DII Net Cash</span>
            <div className="kpi-main-val">
              ₹{fiiDii?.dii?.net ? Math.abs(fiiDii.dii.net).toLocaleString("en-IN") : "0"} Cr
            </div>
            <span className={`kpi-status-tag ${(fiiDii?.dii?.net || 0) >= 0 ? "positive" : "negative"}`}>
              {(fiiDii?.dii?.net || 0) >= 0 ? "▲ Net Buyer" : "▼ Net Seller"}
            </span>
          </div>

          {/* Combined Breadth KPI */}
          <div className="hero-kpi-card border-breadth">
            <span className="kpi-title">NIFTY 500 A/D Breadth</span>
            <div className="kpi-main-val">
              <span style={{ color: "#34d399" }}>▲ {n500?.advances || 0}</span>
              <span style={{ fontSize: "0.9rem", color: "#8b949e", margin: "0 4px" }}>:</span>
              <span style={{ color: "#f87171" }}>▼ {n500?.declines || 0}</span>
            </div>
            <span className="kpi-status-tag info">
              {n500?.adRatio || 1}x Advance Ratio
            </span>
          </div>
        </div>

        {/* ── Main Module 1: Institutional Activity ── */}
        <FiiDiiCard fiiDii={fiiDii} />

        {/* ── Main Module 2: India VIX Volatility & Risk Regime ── */}
        <VixRegimeCard vix={vix} />

        {/* ── Main Module 3: Market Breadth 2.0 & DMA Participation ── */}
        <MarketBreadthCard benchmarks={benchmarks} dmaBreadth={dmaBreadth} />

        {/* ── Main Module 4: Valuation Snapshot ── */}
        <ValuationCard valuation={valuation} />
      </main>
    </div>
  );
}
