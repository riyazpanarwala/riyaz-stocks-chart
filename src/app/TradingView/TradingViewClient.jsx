"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import TickerTape from "../../components/TradingView/TickerTape";
import SymbolInfo from "../../components/TradingView/SymbolInfo";
import AdvancedChart from "../../components/TradingView/AdvancedChart";
import CompanyProfile from "../../components/TradingView/CompanyProfile";
import FundamentalData from "../../components/TradingView/FundamentalData";
import TechnicalAnalysis from "../../components/TradingView/TechnicalAnalysis";
import TopStories from "../../components/TradingView/TopStories";

const DEFAULT_SYMBOL = "BSE:JPPOWER";

/**
 * TradingView client component featuring real-time charts and financial widgets.
 * @returns {React.ReactElement} The TradingView dashboard layout.
 */
export default function TradingViewClient() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [inputValue, setInputValue] = useState(DEFAULT_SYMBOL);
  const isInitializedRef = useRef(false);

  // Resolve URL state after client mount to prevent SSR hydration mismatches
  useEffect(() => {
    if (typeof window === "undefined") return;
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

      if (typeof window !== "undefined") {
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
      }
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
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#000" }}>
      <motion.header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.05)",
          padding: "16px 32px",
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            background: "linear-gradient(90deg,#00bce5,#2962ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
          }}
        >
          TradingView Advanced Stock Charts
        </h1>
        <input
          type="search"
          placeholder="Enter symbol (e.g. BSE:RELIANCE)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Search stock symbol"
          style={{
            padding: "8px 16px",
            width: 300,
            borderRadius: 20,
            border: "1px solid #ccc",
          }}
        />
      </motion.header>

      <TickerTape />
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
          maxWidth: 960,
          margin: "0 auto",
          padding: 16,
        }}
      >
        <motion.section style={{ gridColumn: "span 2" }} {...panelMotion}>
          <SymbolInfo symbol={symbol} />
        </motion.section>
        <motion.section style={{ gridColumn: "span 2" }} {...panelMotion}>
          <AdvancedChart symbol={symbol} />
        </motion.section>
        <motion.section style={{ gridColumn: "span 2" }} {...panelMotion}>
          <CompanyProfile symbol={symbol} />
        </motion.section>
        <motion.section style={{ gridColumn: "span 2" }} {...panelMotion}>
          <FundamentalData symbol={symbol} />
        </motion.section>
        <motion.section {...panelMotion}>
          <TechnicalAnalysis symbol={symbol} />
        </motion.section>
        <motion.section {...panelMotion}>
          <TopStories symbol={symbol} />
        </motion.section>
      </main>
      <footer
        style={{
          textAlign: "center",
          borderTop: "1px solid #eee",
          padding: "16px",
          marginTop: 32,
          fontSize: 12,
          color: "#666",
        }}
      >
        Charts powered by{" "}
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
