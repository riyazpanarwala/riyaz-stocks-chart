"use client";
import React, { useEffect } from "react";

export default function FundamentalData({ symbol = "BSE:TCS" }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      colorTheme: "light",
      isTransparent: true,
      displayMode: "adaptive",
      width: "100%",
      height: "100%",
      locale: "en",
    });
    document.getElementById("tradingview-fundamentals").appendChild(script);
  }, [symbol]);

  return <div id="tradingview-fundamentals" style={{ height: 490, width: "100%" }} />;
}