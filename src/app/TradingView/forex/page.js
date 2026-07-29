import ForexHeatMap from "../../../components/Forex/ForexHeatMap";
import { SITE_URL } from "../../../lib/siteConfig";

export const metadata = {
  title: "Panarwala Live Forex Cross Rates Heat Map | Currency Exchange Rates",
  description:
    "Panarwala Forex Heat Map: Real-time currency cross rates heat map. Track currency exchange rates, major forex pairs, and global foreign exchange market movements live.",
  keywords: [
    "Panarwala forex",
    "Panarwala currency tracker",
    "Panarwala stocks",
    "Riyaz Panarwala",
    "forex cross rates heat map",
    "live currency exchange rates",
    "forex heat map",
    "currency pair tracker",
    "foreign exchange rates India",
  ],
  alternates: {
    canonical: `${SITE_URL}/TradingView/forex`,
  },
  openGraph: {
    title: "Panarwala Live Forex Cross Rates Heat Map | Currency Rates",
    description:
      "Panarwala Forex Heat Map: Track live currency exchange rates and forex cross rates.",
    url: `${SITE_URL}/TradingView/forex`,
    siteName: "Panarwala Stocks",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Panarwala Live Forex Heat Map - Riyaz Panarwala",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panarwala Live Forex Cross Rates Heat Map",
    description: "Panarwala Forex Heat Map: Track live currency exchange rates and forex cross rates.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function ForexPage() {
  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Live Forex Cross Rates Heat Map
      </h1>
      <ForexHeatMap theme="light" />
    </main>
  );
}
