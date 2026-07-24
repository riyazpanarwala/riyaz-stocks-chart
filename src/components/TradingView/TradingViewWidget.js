"use client";

import React, { useEffect, useRef } from "react";

const TradingViewWidget = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use unique container id per instance using containerRef or random ID
    const containerId = container.id || `tv-widget-${Math.random().toString(36).substring(2, 9)}`;
    container.id = containerId;

    const scriptId = "tradingview-widget-script";

    const widgetConfig = {
      container_id: containerId,
      width: "100%",
      height: "500",
      symbol: "NSE:TCS",
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "light",
      style: "1",
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
      if (window.TradingView) {
        initWidget();
      } else {
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          existingScriptWithListener = existingScript;
          existingScript.addEventListener("load", initWidget, { once: true });
        }
      }
    }

    return () => {
      if (existingScriptWithListener) {
        existingScriptWithListener.removeEventListener("load", initWidget);
      }
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "500px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>
    </div>
  );
};

export default TradingViewWidget;

