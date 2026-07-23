"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function TechnicalAnalysis({ symbol = "BSE:TCS" }) {
  const config = {
    interval: "15m",
    width: "100%",
    isTransparent: true,
    height: "100%",
    symbol,
    showIntervalTabs: true,
    displayMode: "single",
    locale: "en",
    colorTheme: "light",
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
      config={config}
      style={{ height: 425, width: "100%" }}
    />
  );
}