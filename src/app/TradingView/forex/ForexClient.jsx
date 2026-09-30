"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiGlobe } from "react-icons/fi";
import useActiveTheme from "../../../components/useActiveTheme";
import AppNavbar from "../../../components/AppNavbar";
import ForexHeatMap from "../../../components/Forex/ForexHeatMap";
import "../TradingView.scss";

/**
 * ForexClient component rendering the real-time currency exchange rates matrix.
 * Adapts dynamically to dark and light UI themes and mobile screen sizes.
 *
 * @returns {React.ReactElement} The Forex heatmap page view.
 */
export default function ForexClient() {
  const theme = useActiveTheme();

  return (
    <div className="tv-page">
      {/* ── Top Navigation Bar ── */}
      <AppNavbar title="Live Forex Cross Rates" />

      {/* ── Header Bar ── */}
      <motion.div
        className="tv-header-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="tv-header-title">
          <span>Global Currency Cross Rates &amp; Exchange Matrix</span>
          <span className="tv-active-badge">Real-Time FX</span>
        </div>
      </motion.div>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px" }}>
        <div className="tv-card" style={{ padding: "24px 16px" }}>
          <ForexHeatMap theme={theme} />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="tv-footer">
        Forex data and currency matrix powered by{" "}
        <a
          href="https://tradingview.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          TradingView
        </a>
        .
      </footer>
    </div>
  );
}
