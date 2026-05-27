// src/app/page.js
import CandleStickChartClient from "../components/CandleStickChartClient";
import { SITE_URL } from "../lib/siteConfig";

export const dynamic = "force-static";

export const metadata = {
  title:
    "Free NSE & BSE Candlestick Charts | Live Stock Technical Analysis",
  description:
    "View live and historical candlestick charts for 5000+ NSE and BSE stocks. Analyse NIFTY, BANKNIFTY, and Indian equities with RSI, MACD, Bollinger Bands, Supertrend, moving averages, and candlestick pattern scanners. 100% free.",
  keywords: [
    "NSE candlestick charts",
    "BSE stock charts",
    "live NIFTY chart",
    "BANKNIFTY chart",
    "RSI MACD NSE",
    "Indian stock technical analysis",
    "free stock charts India",
    "intraday charts NSE BSE",
    "Bollinger bands",
    "supertrend indicator",
    "candlestick pattern scanner",
    "stock breakout detection",
    "moving average crossover",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Free NSE & BSE Candlestick Charts | Live Technical Analysis",
    description:
      "Analyse 5000+ Indian stocks with interactive candlestick charts, RSI, MACD, Supertrend, pattern detection, and fundamental data.",
    url: SITE_URL,
    type: "website",
  },
};

export default function Page() {
  return (
    <main>
      <CandleStickChartClient />
    </main>
  );
}
