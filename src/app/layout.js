import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOOGLE_ANALYTICS_GA_ID } from "../components/config";
import ThemeProvider from "../components/ThemeProvider";
// import JsonLd from "../components/JsonLd";

import "./globals.css";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://riyaz-stocks-chart.vercel.app/";

export const metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Riyaz Panarwala | Live NSE & BSE Stock Charts",
    template: "%s | Riyaz Panarwala Stocks",
  },
  description:
    "Free interactive candlestick charts for Indian stocks. Analyze NSE/BSE data with RSI, MACD, Bollinger Bands, moving averages, supertrend, and technical indicators. Live intraday and historical data.",
  keywords: [
    "NSE",
    "BSE",
    "Stock Charts",
    "Candlestick Charts",
    "Technical Analysis",
    "RSI",
    "MACD",
    "Indian Stocks",
    "Intraday Charts",
    "NIFTY",
    "BANKNIFTY",
    "Options Chain",
    "Live Stock Data",
    "Free Stock Charts",
    "Moving Average",
    "Bollinger Bands",
    "Supertrend",
  ],

  authors: [{ name: "Riyaz Panarwala", url: BASE_URL }],
  creator: "Riyaz Panarwala",
  publisher: "Riyaz Panarwala",

  // Canonical & alternate
  alternates: {
    canonical: BASE_URL,
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: "Riyaz Panarwala Stocks",
    title: "Riyaz Panarwala | Live NSE & BSE Stock Charts",
    description:
      "Free interactive candlestick charts for Indian stocks. Analyze NSE/BSE data with RSI, MACD, Bollinger Bands, and more technical indicators.",
    images: [
      {
        url: "/og-image.png", // Place a 1200x630 image in /public
        width: 1200,
        height: 630,
        alt: "Riyaz Panarwala - Live NSE & BSE Stock Charts",
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: "summary_large_image",
    title: "Live NSE & BSE Stock Charts | Riyaz Panarwala",
    description:
      "Free interactive candlestick charts for Indian stocks with RSI, MACD, and 15+ technical indicators.",
    images: ["/og-image.png"],
    creator: "@riyazpanarwala",
  },

  // Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Verification (add your tokens when ready)
  // verification: {
  //   google: "YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN",
  //   yandex: "YOUR_YANDEX_TOKEN",
  // },

  // Misc
  category: "finance",
};

// Viewport must be exported separately (Next.js 14+)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e17" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        {/* JSON-LD structured data for the whole site */}
        {/* <JsonLd /> */}

        {/* Google Analytics */}
        {GOOGLE_ANALYTICS_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-script" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ANALYTICS_GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
