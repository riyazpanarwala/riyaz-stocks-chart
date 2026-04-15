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
    let existingScriptWithListener = null;

    const initWidget = () => {
      const container = document.getElementById(containerId);
      if (window.TradingView && container) {
        new window.TradingView.widget(widgetConfig);
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    } else {
      // Script tag exists — either already loaded or still loading
      if (window.TradingView) {
        initWidget();
      } else {
        // Still loading: wait for the existing script's load event
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          existingScriptWithListener = existingScript;
          existingScript.addEventListener("load", initWidget, { once: true });
        }
      }
    }

    // Cleanup always runs on unmount regardless of which branch ran above.
    // This prevents stale widget instances and duplicate renders (e.g. React
    // StrictMode double-invoke or HMR hot reload).
    return () => {
      if (existingScriptWithListener) {
        existingScriptWithListener.removeEventListener("load", initWidget);
      }
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
