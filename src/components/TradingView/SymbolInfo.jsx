"use client";
import React, { useEffect } from "react";

export default function SymbolInfo({ symbol = "BSE:TCS" }) {
  useEffect(() => {
    const container = document.getElementById("tradingview-symbol-info");
    if (!container) return;

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      locale: "en",
      colorTheme: "light",
      isTransparent: true,
    });
    
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return <div id="tradingview-symbol-info" style={{ width: "100%", marginBottom: 32 }} />;
}