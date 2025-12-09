"use client";
import React, { useEffect } from "react";

export default function AdvancedChart({ symbol = "BSE:TCS" }) {
  useEffect(() => {
    const container = document.getElementById("tradingview-advanced-chart");
    if (!container) return;

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "light",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com",
    });
    
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return <div id="tradingview-advanced-chart" style={{ height: 500, width: "100%" }} />;
}