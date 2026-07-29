import TradingViewClient from "./TradingViewClient";
import { SITE_URL } from "../../lib/siteConfig";

export const metadata = {
  title: "TradingView Advanced Stock Charts | Technical Analysis & Fundamentals",
  description:
    "Interactive TradingView charting interface for Indian NSE & BSE stocks. View real-time prices, financial profiles, technical indicators, and market news.",
  keywords: [
    "TradingView stock charts",
    "NSE TradingView chart",
    "BSE TradingView chart",
    "Indian stock technical analysis",
    "live equity ticker India",
    "fundamental data NSE stocks",
  ],
  alternates: {
    canonical: `${SITE_URL}/TradingView`,
  },
  openGraph: {
    title: "TradingView Advanced Stock Charts | Indian Equity Analysis",
    description:
      "Interactive TradingView charting interface for Indian NSE & BSE stocks with live ticker, financial profiles, and technical indicators.",
    url: `${SITE_URL}/TradingView`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "TradingView Stock Charts - Riyaz Panarwala",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TradingView Advanced Stock Charts | Technical Analysis",
    description:
      "Interactive TradingView charting interface for Indian NSE & BSE stocks with real-time technical indicators.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function TradingViewPage() {
  return <TradingViewClient />;
}
