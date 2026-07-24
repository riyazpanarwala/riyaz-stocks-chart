"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function CompanyProfile({ symbol = "BSE:TCS" }) {
  const config = {
    symbol,
    width: "100%",
    height: "100%",
    colorTheme: "light",
    isTransparent: true,
    locale: "en",
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js"
      config={config}
      style={{ height: 400, width: "100%" }}
    />
  );
}