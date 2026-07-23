"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function FundamentalData({ symbol = "BSE:TCS" }) {
  const config = {
    symbol,
    colorTheme: "light",
    isTransparent: true,
    displayMode: "adaptive",
    width: "100%",
    height: "100%",
    locale: "en",
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
      config={config}
      style={{ height: 490, width: "100%" }}
    />
  );
}