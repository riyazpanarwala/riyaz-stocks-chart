import OptionChainClient from "./OptionChainClient";
import { SITE_URL } from "../../lib/siteConfig";

export const metadata = {
  title: "Panarwala Live NSE Option Chain Analysis | NIFTY & BANKNIFTY Options Data",
  description:
    "Panarwala Option Chain: Real-time NSE option chain data for NIFTY, BANKNIFTY, and Indian F&O stocks with Open Interest (OI), ΔOI, Put-Call Ratio (PCR), Max Pain, and Smart Money indicators.",
  keywords: [
    "Panarwala option chain",
    "Panarwala NIFTY option chain",
    "Panarwala options",
    "Panarwala stocks",
    "Riyaz Panarwala",
    "NSE option chain",
    "NIFTY option chain live",
    "BANKNIFTY option chain",
    "open interest analysis",
    "put call ratio live",
    "max pain indicator",
    "F&O stock options India",
  ],
  alternates: {
    canonical: `${SITE_URL}/optionchain`,
  },
  openGraph: {
    title: "Panarwala Live NSE Option Chain Analysis | NIFTY & BANKNIFTY",
    description:
      "Panarwala Option Chain: Real-time NSE option chain with Open Interest, Delta OI, Put-Call Ratio, and Max Pain analysis for Indian markets.",
    url: `${SITE_URL}/optionchain`,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Panarwala NSE Option Chain Analysis - Riyaz Panarwala",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panarwala Live NSE Option Chain Analysis | Open Interest Data",
    description:
      "Panarwala Option Chain: Real-time option chain for NIFTY, BANKNIFTY, and F&O equities with OI, PCR, and Max Pain tracking.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function OptionChainPage() {
  return <OptionChainClient />;
}
