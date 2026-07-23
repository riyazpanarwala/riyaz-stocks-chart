"use client";
import React, { useEffect, useRef } from "react";

export default function TradingViewEmbed({
  scriptSrc,
  config,
  style = { width: "100%" },
  className = "",
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.innerHTML = JSON.stringify(config);

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [scriptSrc, JSON.stringify(config)]);

  return <div ref={containerRef} style={style} className={className} />;
}
