// src/app/sentiment/page.js
import SentimentClient from "./SentimentClient";
import { getMacroSentimentData } from "@/services/market/macroSentimentService";
import { SITE_URL } from "../../lib/siteConfig";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Indian Stock Market Sentiment & Macro Indicators | FII DII, India VIX & Breadth",
  description:
    "Track live Indian stock market macro sentiment indicators: official NSE FII/DII cash flows, India VIX volatility regime gauge, NIFTY 500 advance/decline breadth, and valuation multiples.",
  keywords: [
    "FII DII activity live",
    "India VIX regime",
    "NSE market breadth",
    "NIFTY 500 advance decline",
    "FII cash flow today",
    "DII net investment",
    "India VIX trading strategy",
    "Nifty 50 PE ratio",
    "Panarwala market sentiment",
    "Riyaz Panarwala",
  ],
  alternates: {
    canonical: `${SITE_URL}/sentiment`,
  },
  openGraph: {
    title: "Market Sentiment & Macro Indicators Dashboard | Panarwala Stocks",
    description:
      "Live Indian Stock Market sentiment: FII/DII institutional cash flows, India VIX volatility gauge, multi-index breadth, and valuation ratios.",
    url: `${SITE_URL}/sentiment`,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Panarwala Market Sentiment & Macro Indicators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Sentiment & Macro Indicators Dashboard | Panarwala Stocks",
    description:
      "Live Indian Stock Market sentiment: FII/DII institutional cash flows, India VIX volatility gauge, and market breadth.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

/**
 * SentimentPage - Next.js App Router server component that pre-fetches initial
 * macro sentiment data on the server to prevent layout shift and maximize SEO.
 *
 * @returns {Promise<JSX.Element>} Rendered SentimentClient component.
 */
export default async function SentimentPage() {
  let initialData = null;
  try {
    initialData = await getMacroSentimentData({ forceRefresh: false });
  } catch (err) {
    console.error("Error pre-fetching macro sentiment data on server:", err.message);
  }

  return <SentimentClient initialData={initialData} />;
}
