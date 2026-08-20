// src/components/SeoIntro.jsx
// Shown only before candle data loads; provides keyword-rich HTML for crawlers.
// Conditionally rendered in CandleStickChartClient when candleData is empty.

import React from "react";

const features = [
  {
    icon: "📈",
    title: "Live NSE & BSE Charts",
    desc: "Real-time candlestick charts for 5000+ equities, indices, and ETFs listed on NSE and BSE.",
  },
  {
    icon: "📊",
    title: "15+ Technical Indicators",
    desc: "RSI, MACD, Bollinger Bands, Stochastic, CCI, MFI, ADX/DMI, Supertrend, OBV, EMA, SMA crossovers, and Zero-Lag MACD.",
  },
  {
    icon: "🕯️",
    title: "Candlestick Pattern Scanner",
    desc: "Automatically detect Hammer, Morning Star, Doji, Engulfing, Marubozu, Harami, and 30+ candlestick patterns.",
  },
  {
    icon: "🔍",
    title: "Breakout Detection",
    desc: "Identify volume breakouts, support & resistance breakouts, and Chandelier Exit signals.",
  },
  {
    icon: "📉",
    title: "Intraday & Historical Data",
    desc: "Analyse 1-minute to monthly intervals. View up to 20 years of historical data for any stock.",
  },
  {
    icon: "🏦",
    title: "Fundamental Data",
    desc: "Access P/E ratio, EPS, book value, market cap, ROE, ROCE, and 52-week range for NSE-listed stocks.",
  },
];

const indicators = [
  "RSI (14)",
  "MACD (12,26,9)",
  "Bollinger Bands (20,2)",
  "Stochastic (20,3)",
  "CCI (20)",
  "MFI (14)",
  "ADX / DMI",
  "Supertrend",
  "OBV",
  "EMA (50, 200)",
  "SMA (5, 10, 20, 50, 100, 200)",
  "Zero-Lag MACD",
  "SMA Crossovers (5/20, 20/50, 50/200)",
];

export default function SeoIntro({ headingTag = "h2" }) {
  const HeadingTag = headingTag;
  return (
    <section
      className="seo-intro"
      aria-label="About this stock charting tool"
      style={{
        padding: "40px 28px 32px",
        maxWidth: 960,
        margin: "0 auto",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Section heading */}
      <HeadingTag
        style={{
          fontSize: "clamp(20px, 3vw, 28px)",
          fontWeight: 700,
          color: "var(--tx-primary)",
          marginBottom: 10,
          lineHeight: 1.3,
        }}
      >
        Panarwala Stocks – Free NSE &amp; BSE Stock Candlestick Charts
      </HeadingTag>
      <p
        style={{
          fontSize: 15,
          color: "var(--tx-second)",
          marginBottom: 36,
          lineHeight: 1.7,
          maxWidth: 720,
        }}
      >
        Panarwala Stocks provides professional-grade interactive charts for Indian equities, indices, and
        ETFs. Select any stock above to load live candlestick data with
        real-time technical indicators.
      </p>

      {/* Feature grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {features.map((f) => (
          <article
            key={f.title}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--bd-dim)",
              borderRadius: "var(--radius-md)",
              padding: "18px 20px",
            }}
          >
            <div
              style={{ fontSize: 24, marginBottom: 8 }}
              aria-hidden="true"
            >
              {f.icon}
            </div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--tx-primary)",
                marginBottom: 6,
              }}
            >
              {f.title}
            </h3>
            <p style={{ fontSize: 13, color: "var(--tx-second)", lineHeight: 1.6 }}>
              {f.desc}
            </p>
          </article>
        ))}
      </div>

      {/* Indicator list */}
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--bd-faint)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
          marginBottom: 40,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--tx-primary)",
            marginBottom: 14,
          }}
        >
          Supported Technical Indicators
        </h3>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 14px",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {indicators.map((ind) => (
            <li
              key={ind}
              style={{
                fontSize: 12,
                color: "var(--accent)",
                background: "var(--accent-soft)",
                border: "1px solid var(--bd-accent)",
                borderRadius: "var(--radius-xs)",
                padding: "3px 10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {ind}
            </li>
          ))}
        </ul>
      </div>

      {/* How to use */}
      <div>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--tx-primary)",
            marginBottom: 12,
          }}
        >
          How to Use
        </h3>
        <ol
          style={{
            paddingLeft: 20,
            color: "var(--tx-second)",
            fontSize: 13,
            lineHeight: 2,
          }}
        >
          <li>
            <strong style={{ color: "var(--tx-primary)" }}>Select a stock</strong>{" "}
            — search by name or symbol in the dropdown above.
          </li>
          <li>
            <strong style={{ color: "var(--tx-primary)" }}>Choose interval</strong>{" "}
            — pick intraday (1m–30m) or historical (daily, weekly, monthly).
          </li>
          <li>
            <strong style={{ color: "var(--tx-primary)" }}>Add indicators</strong>{" "}
            — open the Indicator menu in the left sidebar.
          </li>
          <li>
            <strong style={{ color: "var(--tx-primary)" }}>Scan patterns</strong>{" "}
            — use Pattern or Breakout menus to detect setups automatically.
          </li>
          <li>
            <strong style={{ color: "var(--tx-primary)" }}>Draw tools</strong>{" "}
            — add trendlines, measurements, text labels, long/short positions,
            circles, and rectangles.
          </li>
        </ol>
      </div>
    </section>
  );
}
