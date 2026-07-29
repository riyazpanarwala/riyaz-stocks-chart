import ForexHeatMap from "../../../components/Forex/ForexHeatMap";
import { SITE_URL } from "../../../lib/siteConfig";

export const metadata = {
  title: "Live Forex Cross Rates Heat Map | Currency Exchange Rates",
  description:
    "Real-time Forex cross rates heat map. Track currency exchange rates, major forex pairs, and global foreign exchange market movements live.",
  keywords: [
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
    title: "Live Forex Cross Rates Heat Map | Currency Rates",
    description:
      "Track live currency exchange rates and forex cross rates heat map.",
    url: `${SITE_URL}/TradingView/forex`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Live Forex Heat Map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Forex Cross Rates Heat Map",
    description: "Track live currency exchange rates and forex cross rates.",
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
