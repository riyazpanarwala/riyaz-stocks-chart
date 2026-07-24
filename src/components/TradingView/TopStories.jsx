"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function TopStories({ symbol = "BSE:TCS" }) {
  const config = {
    feedMode: "symbol",
    symbol,
    colorTheme: "light",
    isTransparent: true,
    displayMode: "regular",
    width: "100%",
    height: "100%",
    locale: "en",
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
      config={config}
      style={{ height: 425, width: "100%" }}
    />
  );
}