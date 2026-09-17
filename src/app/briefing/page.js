// src/app/briefing/page.js
import BriefingClient from "./BriefingClient";
import { SITE_URL } from "../../lib/siteConfig";

export const metadata = {
  title: "AI Pre-Market & Daily Market Briefing | Indian Equities Swing Watchlist",
  description:
    "Daily automated AI-powered Indian stock market briefing synthesized with Google Gemini. Market breadth, top swing setups, risk alerts, and tactical execution gameplan.",
  keywords: [
    "AI market briefing",
    "pre-market report India",
    "daily stock briefing",
    "NSE swing setups",
    "Google Gemini stock analysis",
    "market breadth Nifty",
    "Indian stock market AI analysis",
    "Panarwala market briefing",
    "Riyaz Panarwala",
  ],
  alternates: {
    canonical: `${SITE_URL}/briefing`,
  },
  openGraph: {
    title: "AI Pre-Market & Daily Market Briefing | Panarwala Stocks",
    description:
      "Automated AI-powered daily market briefing: sentiment pulse, breadth, high-conviction swing setups, and risk warnings for Indian equities.",
    url: `${SITE_URL}/briefing`,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AI Pre-Market & Daily Briefing - Panarwala Stocks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Pre-Market & Daily Market Briefing | Panarwala Stocks",
    description:
      "Automated AI-powered daily market briefing: sentiment pulse, breadth, high-conviction swing setups, and risk warnings.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

/**
 * AI Pre-Market & Daily Market Briefing Page.
 * @returns {JSX.Element} The rendered BriefingClient component.
 */
export default function BriefingPage() {
  return <BriefingClient />;
}
