"use client";
import React, { useEffect } from "react";

export default function TickerTape() {
  useEffect(() => {
    const container = document.getElementById("tradingview-ticker-tape");
    if (!container) return;

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "BSE:TCS" },
        { proName: "BSE:RELIANCE" },
        { proName: "BSE:HDFCBANK" },
        { proName: "BSE:INFY" },
        { proName: "BSE:ITC" },
        { proName: "BSE:SBIN" },
      ],
      showSymbolLogo: true,
      colorTheme: "light",
      displayMode: "adaptive",
      locale: "en",
    });
   
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div id="tradingview-ticker-tape" style={{ width: "100%", marginBottom: 32 }} />
  );
}