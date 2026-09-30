"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiSearch, FiBarChart2, FiGlobe } from "react-icons/fi";
import useActiveTheme from "../../components/useActiveTheme";
import AppNavbar from "../../components/AppNavbar";
import TickerTape from "../../components/TradingView/TickerTape";
import SymbolInfo from "../../components/TradingView/SymbolInfo";
import AdvancedChart from "../../components/TradingView/AdvancedChart";
import CompanyProfile from "../../components/TradingView/CompanyProfile";
import FundamentalData from "../../components/TradingView/FundamentalData";
import TechnicalAnalysis from "../../components/TradingView/TechnicalAnalysis";
import TopStories from "../../components/TradingView/TopStories";
import "./TradingView.scss";

const DEFAULT_SYMBOL = "BSE:JPPOWER";

/**
 * TradingView client component featuring real-time charts and financial widgets.
 * Automatically adapts to dark and light UI themes and responsive mobile screens.
 *
 * @returns {React.ReactElement} The TradingView dashboard layout.
 */
export default function TradingViewClient() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [inputValue, setInputValue] = useState(DEFAULT_SYMBOL);
  const isInitializedRef = useRef(false);
  const theme = useActiveTheme();

  // Resolve URL state after client mount to prevent SSR hydration mismatches
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSymbol = (params.get("symbol") || params.get("q") || "").trim();
    if (urlSymbol) {
      setSymbol(urlSymbol);
      setInputValue(urlSymbol);
    }
    isInitializedRef.current = true;
  }, []);

  // Sync input value to symbol state and URL with debouncing
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      const nextSymbol = trimmed || DEFAULT_SYMBOL;
      setSymbol(nextSymbol);

      try {
        const url = new URL(window.location.href);
        if (trimmed) {
          url.searchParams.set("symbol", trimmed);
        } else {
          url.searchParams.delete("symbol");
        }
        const nextSearch = url.searchParams.toString();
        const nextUrl = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname;
        window.history.replaceState(window.history.state, "", nextUrl);
      } catch (e) {}
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const panelMotion = {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.35 },
  };

  return (
    <div className="tv-page">
      {/* ── Top Navigation Bar ── */}
      <AppNavbar title="TradingView Advanced Charts" />

      {/* ── Secondary Control / Symbol Header ── */}
      <motion.div
        className="tv-header-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="tv-header-title">
          <span>Active Symbol:</span>
          <span className="tv-active-badge">{symbol}</span>
        </div>
        <div className="tv-search-wrapper">
          <FiSearch className="tv-search-icon" size={16} />
          <input
            type="search"
            placeholder="Search symbol (e.g. BSE:RELIANCE, NSE:TCS)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            aria-label="Search stock symbol"
            className="tv-search-input"
          />
        </div>
      </motion.div>

      {/* ── Live Ticker Tape ── */}
      <TickerTape theme={theme} />

      {/* ── Responsive Main Grid ── */}
      <main className="tv-main">
        <motion.section className="tv-col-span-2 tv-card" {...panelMotion}>
          <SymbolInfo symbol={symbol} theme={theme} />
        </motion.section>

        <motion.section className="tv-col-span-2 tv-card" {...panelMotion}>
          <AdvancedChart symbol={symbol} theme={theme} />
        </motion.section>

        <motion.section className="tv-col-span-2 tv-card" {...panelMotion}>
          <CompanyProfile symbol={symbol} theme={theme} />
        </motion.section>

        <motion.section className="tv-col-span-2 tv-card" {...panelMotion}>
          <FundamentalData symbol={symbol} theme={theme} />
        </motion.section>

        <motion.section className="tv-col-span-1 tv-card" {...panelMotion}>
          <TechnicalAnalysis symbol={symbol} theme={theme} />
        </motion.section>

        <motion.section className="tv-col-span-1 tv-card" {...panelMotion}>
          <TopStories symbol={symbol} theme={theme} />
        </motion.section>
      </main>

      {/* ── Footer ── */}
      <footer className="tv-footer">
        Charts and financial widgets powered by{" "}
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
