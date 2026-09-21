// src/app/heatmap/page.js
import HeatmapClient from "./HeatmapClient";
import { getSectorBreadthData } from "@/services/market/sectorBreadthService";
import { SITE_URL } from "../../lib/siteConfig";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "NSE Sector Heatmap & Market Breadth Dashboard | Live Sectoral Performance",
  description:
    "Live Indian Stock Market (NSE) Sector Heatmap and Market Breadth Dashboard. Track real-time performance of NIFTY Bank, IT, Auto, Pharma, FMCG, Metal, Advance/Decline ratio, and 50/200 DMA trend health.",
  keywords: [
    "NSE sector heatmap",
    "market breadth India",
    "NIFTY sector performance",
    "advance decline ratio NSE",
    "NIFTY Bank heatmap",
    "stocks above 50 DMA",
    "stocks above 200 DMA",
    "sector rotation India",
    "Panarwala stock charts",
    "Riyaz Panarwala",
  ],
  alternates: {
    canonical: `${SITE_URL}/heatmap`,
  },
  openGraph: {
    title: "NSE Sector Heatmap & Market Breadth Dashboard | Panarwala Stocks",
    description:
      "Real-time visual Sector Heatmap and Market Breadth Meter for NSE Indian equities. Track sectoral strength, Advance/Decline balance, and moving average participation.",
    url: `${SITE_URL}/heatmap`,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "NSE Sector Heatmap & Market Breadth - Panarwala Stocks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NSE Sector Heatmap & Market Breadth Dashboard | Panarwala Stocks",
    description:
      "Real-time visual Sector Heatmap and Market Breadth Meter for NSE Indian equities.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

/**
 * HeatmapPage - Next.js App Router server component that pre-fetches initial
 * sector breadth dataset on the server to prevent layout shift and maximize SEO.
 *
 * @returns {Promise<JSX.Element>} Rendered HeatmapClient component.
 */
export default async function HeatmapPage() {
  let initialData = null;
  try {
    initialData = await getSectorBreadthData({ forceRefresh: false });
  } catch (err) {
    console.error("Error pre-fetching heatmap data on server:", err.message);
  }

  return <HeatmapClient initialData={initialData} />;
}
