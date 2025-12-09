"use client";

import React, { useState, useEffect } from "react";
import TickerTape from "../../components/TradingView/TickerTape";
import SymbolInfo from "../../components/TradingView/SymbolInfo";
import AdvancedChart from "../../components/TradingView/AdvancedChart";
import CompanyProfile from "../../components/TradingView/CompanyProfile";
import FundamentalData from "../../components/TradingView/FundamentalData";
import TechnicalAnalysis from "../../components/TradingView/TechnicalAnalysis";
import TopStories from "../../components/TradingView/TopStories";

export default function StocksPage() {
  const [symbol, setSymbol] = useState("BSE:TCS");
  const [inputValue, setInputValue] = useState("BSE:TCS");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSymbol(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#000" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.05)",
          padding: "16px 32px",
        }}
      >
        <h1
          style={{
            background: "linear-gradient(90deg,#00bce5,#2962ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          TradingView Integration
        </h1>
        <input
          type="search"
          placeholder="Enter symbol (e.g. BSE:RELIANCE)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{
            padding: "8px 16px",
            width: 300,
            borderRadius: 20,
            border: "1px solid #ccc",
          }}
        />
      </header>

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
        <section style={{ gridColumn: "span 2" }}>
          <SymbolInfo symbol={symbol} />
        </section>
        <section style={{ gridColumn: "span 2" }}>
          <AdvancedChart symbol={symbol} />
        </section>
        <section style={{ gridColumn: "span 2" }}>
          <CompanyProfile symbol={symbol} />
        </section>
        <section style={{ gridColumn: "span 2" }}>
          <FundamentalData symbol={symbol} />
        </section>
        <section>
          <TechnicalAnalysis symbol={symbol} />
        </section>
        <section>
          <TopStories symbol={symbol} />
        </section>
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
        Charts powered by <a href="https://tradingview.com">TradingView</a>.
      </footer>
    </div>
  );
}
