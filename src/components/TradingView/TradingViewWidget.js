"use client";

import React, { useEffect } from "react";

const TradingViewWidget = () => {
  useEffect(() => {
    const containerId = "tradingview-widget-container";
    const scriptId = "tradingview-widget-script";

    const widgetConfig = {
      container_id: containerId,
      width: "100%",
      height: "500",
      symbol: "NSE:TCS", // default symbol
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
    };

    // Avoid duplicates
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;

      script.onload = () => {
        const container = document.getElementById(containerId);
        if (window.TradingView && container) {
          new window.TradingView.widget(widgetConfig);
        }
      };

      document.body.appendChild(script);
    } else {
      // If script is already loaded, just reinitialize widget
      if (window.TradingView) {
        new window.TradingView.widget(widgetConfig);
      }
    }

    // Optional cleanup: remove the widget on unmount
    return () => {
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = "";
    };
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
