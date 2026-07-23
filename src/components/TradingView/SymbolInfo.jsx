"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function SymbolInfo({ symbol = "BSE:TCS" }) {
  const config = {
    symbol,
    width: "100%",
    locale: "en",
    colorTheme: "light",
    isTransparent: true,
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js"
      config={config}
      style={{ width: "100%", marginBottom: 32 }}
    />
  );
}