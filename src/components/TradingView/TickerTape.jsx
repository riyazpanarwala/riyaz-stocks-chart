"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function TickerTape() {
  const config = {
    symbols: [
      { proName: "BSE:TCS" },
      { proName: "BSE:RELIANCE" },
      { proName: "BSE:HDFCBANK" },
      { proName: "BSE:INFY" },
      { proName: "BSE:ITC" },
      { proName: "BSE:SBIN" },
    ],
    showSymbolLogo: true,
    colorTheme: "light",
    displayMode: "adaptive",
    locale: "en",
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
      config={config}
      style={{ width: "100%", marginBottom: 32 }}
    />
  );
}