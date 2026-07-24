"use client";
import React, { useEffect, useRef } from "react";

export default function TradingViewEmbed({
  scriptSrc,
  config,
  style = { width: "100%" },
  className = "",
}) {
  const containerRef = useRef(null);
  const configString = JSON.stringify(config);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.innerHTML = configString;

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [scriptSrc, configString]);

  return <div ref={containerRef} style={style} className={className} />;
}
