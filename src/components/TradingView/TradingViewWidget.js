"use client";

import React, { useEffect } from "react";

const TradingViewWidget = () => {
  useEffect(() => {
    // Check if the TradingView script is already added to avoid duplicates
    if (!document.getElementById("tradingview-widget-script")) {
      const script = document.createElement("script");
      script.id = "tradingview-widget-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // Initialize the widget after the script is loaded
        new window.TradingView.widget({
          container_id: "tradingview-widget-container",
          width: "100%",
          height: "500",
          symbol: "NSE:TCS", // Default symbol
          interval: "D", // Time interval (e.g., 'D', '1W', '1M')
          timezone: "Asia/Kolkata",
          theme: "light", // Options: 'light' or 'dark'
          style: "1", // Chart style
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          details: true,
          hotlist: true,
          calendar: true,
        });
      };
    }
  }, []);

  return (
    <div
      id="tradingview-widget-container"
      style={{
        width: "100%",
        height: "500px",
        margin: "0 auto",
      }}
    >
      {/* Fallback message while the widget loads */}
      <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>
    </div>
  );
};

export default TradingViewWidget;
