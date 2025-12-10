"use client";
import React, { useEffect, useRef } from "react";

export default function ForexHeatMap({ theme = "light" }) {
    const container = useRef(null);

    useEffect(() => {
        // Clear old widget before adding a new one (for theme or re-render)
        if (container.current) container.current.innerHTML = "";

        const script = document.createElement("script");
        script.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js";
        script.type = "text/javascript";
        script.async = true;

        // TradingView widget configuration
        script.innerHTML = JSON.stringify({
            width: "100%",
            height: 420,
            currencies: [
                "INR",
                "EUR",
                "USD",
                "JPY",
                "GBP",
                "CHF",
                "AUD",
                "CAD",
                "NZD",
                "CNY",
                "SGD"
            ],
            colorTheme: theme, // 'light' or 'dark'
            isTransparent: false,
            locale: "en",
            backgroundColor: theme === "dark" ? "#0F0F0F" : "#FFFFFF",
        });

        container.current.appendChild(script);
    }, [theme]);

    return (
        <div
            className="tradingview-widget-container"
            ref={container}
            style={{
                width: "100%",
                maxWidth: "1200px",
                margin: "auto",
            }}
        >
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
}
