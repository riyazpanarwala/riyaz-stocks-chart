// src/app/screener/page.js
import ScreenerClient from "./ScreenerClient";
import { SITE_URL } from "../../lib/siteConfig";

export const metadata = {
  title: "NSE Real-Time Stock Signal Screener | Buy & Sell Breakout Scanner",
  description:
    "Real-time visual stock screener for NSE equities. Screen Indian stocks across 200 EMA trend filters, 52-week high momentum, ADX strength, and RSI confluence for algorithmic BUY and EXIT signals.",
  keywords: [
    "NSE stock screener",
    "stock signal scanner",
    "NSE buy signals",
    "NSE sell signals",
    "algorithmic stock screener India",
    "swing trading screener",
    "200 EMA breakout scanner",
    "52-week high breakout stocks",
    "Panarwala stock screener",
    "Riyaz Panarwala",
  ],
  alternates: {
    canonical: `${SITE_URL}/screener`,
  },
  openGraph: {
    title: "NSE Real-Time Stock Signal Screener | Panarwala Stocks",
    description:
      "Screen 500+ NSE stocks in real-time for confirmed algorithmic BUY, EXIT, and momentum breakout signals with risk targets.",
    url: `${SITE_URL}/screener`,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "NSE Stock Signal Screener - Panarwala Stocks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NSE Real-Time Stock Signal Screener | Panarwala Stocks",
    description:
      "Screen Indian stocks for confirmed algorithmic BUY and EXIT signals with ADX and RSI confluence.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function ScreenerPage() {
  return <ScreenerClient />;
}
