"use client";
import React from "react";
import TradingViewEmbed from "./TradingViewEmbed";

export default function AdvancedChart({ symbol = "BSE:TCS" }) {
  const config = {
    autosize: true,
    symbol,
    interval: "D",
    timezone: "Asia/Kolkata",
    theme: "light",
    style: "1",
    locale: "en",
    allow_symbol_change: true,
    support_host: "https://www.tradingview.com",
    studies: [
      "MASimple@tv-basicstudies",
      "RSI@tv-basicstudies",
      "MACD@tv-basicstudies",
      "BB@tv-basicstudies",
      "STD;MA%1Cross",
      "Volume@tv-basicstudies",
    ],
  };

  return (
    <TradingViewEmbed
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
      config={config}
      style={{ height: 700, width: "100%" }}
    />
  );
}