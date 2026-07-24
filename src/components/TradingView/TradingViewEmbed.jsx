"use client";
import React, { useEffect, useRef } from "react";
import { getTradingViewSymbol } from "./tradingViewSymbol";

export default function TradingViewEmbed({
  scriptSrc,
  config,
  style = { width: "100%" },
  className = "",
}) {
  const containerRef = useRef(null);

  // Resolve valid symbol for TradingView (returns null if unmapped / invalid)
  const resolvedSymbol = config?.symbol ? getTradingViewSymbol(config.symbol) : null;
  const isSymbolWidget = config && "symbol" in config;

  // If component is a symbol-based widget but resolvedSymbol is null, hide it
  const validConfig = isSymbolWidget
    ? resolvedSymbol
      ? { ...config, symbol: resolvedSymbol }
      : null
    : config;

  const configString = validConfig ? JSON.stringify(validConfig) : "";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !validConfig) return;

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
  }, [scriptSrc, configString, validConfig]);

  if (isSymbolWidget && (!validConfig || !resolvedSymbol)) {
    return null; // Cleanly hide widget if no symbol match exists
  }

  return <div ref={containerRef} style={style} className={className} />;
}
