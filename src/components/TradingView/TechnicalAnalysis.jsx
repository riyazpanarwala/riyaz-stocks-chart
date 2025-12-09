"use client";
import React, { useEffect } from "react";

export default function TechnicalAnalysis({ symbol = "BSE:TCS" }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: "15m",
      width: "100%",
      isTransparent: true,
      height: "100%",
      symbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: "light",
    });
    document.getElementById("tradingview-technical").appendChild(script);
  }, [symbol]);

  return <div id="tradingview-technical" style={{ height: 425, width: "100%" }} />;
}