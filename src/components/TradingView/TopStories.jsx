"use client";
import React, { useEffect } from "react";

export default function TopStories({ symbol = "BSE:TCS" }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: "symbol",
      symbol,
      colorTheme: "light",
      isTransparent: true,
      displayMode: "regular",
      width: "100%",
      height: "100%",
      locale: "en",
    });
    document.getElementById("tradingview-top-stories").appendChild(script);
  }, [symbol]);

  return <div id="tradingview-top-stories" style={{ height: 425, width: "100%" }} />;
}