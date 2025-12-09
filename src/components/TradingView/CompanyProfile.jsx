"use client";
import React, { useEffect } from "react";

export default function CompanyProfile({ symbol = "BSE:TCS" }) {
  const container = document.getElementById("tradingview-company-profile");
  if (!container) return;

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      height: "100%",
      colorTheme: "light",
      isTransparent: true,
      locale: "en",
    });
    
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return <div id="tradingview-company-profile" style={{ height: 400, width: "100%" }} />;
}