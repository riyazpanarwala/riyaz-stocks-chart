import CandleStickChartClient from "../components/CandleStickChartClient";
import JsonLd from "../components/JsonLd";
import { SITE_URL } from "../lib/siteConfig";

export const dynamic = "force-static";

export const metadata = {
  title: "Panarwala Stocks | Free NSE & BSE Candlestick Charts & Live Technical Analysis",
  description:
    "Panarwala Stocks: View live and historical candlestick charts for 5000+ NSE and BSE stocks. Analyse NIFTY, BANKNIFTY, and Indian equities with RSI, MACD, Bollinger Bands, Supertrend, moving averages, and candlestick pattern scanners. 100% free.",
  keywords: [
    "Panarwala",
    "Panarwala stocks",
    "Panarwala stock charts",
    "Riyaz Panarwala",
    "Panarwala NSE BSE",
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
    title: "Panarwala Stocks | Free NSE & BSE Candlestick Charts & Technical Analysis",
    description:
      "Panarwala Stocks: Analyse 5000+ Indian stocks with interactive candlestick charts, RSI, MACD, Supertrend, pattern detection, and fundamental data.",
    url: SITE_URL,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Panarwala Free NSE & BSE Candlestick Charts - Riyaz Panarwala",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panarwala Stocks | Free NSE & BSE Candlestick Charts & Technical Analysis",
    description:
      "Panarwala Stocks: Analyse 5000+ Indian stocks with interactive candlestick charts, RSI, MACD, Supertrend, and pattern detection.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function Page() {
  return (
    <main>
      <JsonLd includeFaq={true} />
      <CandleStickChartClient />
    </main>
  );
}
