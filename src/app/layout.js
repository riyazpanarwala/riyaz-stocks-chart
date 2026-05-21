// src/app/layout.js
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOOGLE_ANALYTICS_GA_ID } from "../components/config";
import ThemeProvider from "../components/ThemeProvider";
import JsonLd from "../components/JsonLd";

import "./globals.css";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://riyaz-stocks-chart.vercel.app/";

export const metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:
      "Free NSE & BSE Stock Charts | Candlestick Charts with Technical Indicators",
    template: "%s | Riyaz Panarwala Stocks",
  },
  description:
    "Free interactive candlestick charts for NSE and BSE stocks. Analyse NIFTY, BANKNIFTY, and 5000+ Indian equities with RSI, MACD, Bollinger Bands, Supertrend, moving averages, and 15+ technical indicators. Live intraday and historical data.",
  keywords: [
    "NSE stock charts",
    "BSE stock charts",
    "candlestick charts India",
    "free stock charts NSE",
    "technical analysis India",
    "RSI indicator NSE",
    "MACD indicator",
    "NIFTY chart",
    "BANKNIFTY chart",
    "intraday charts NSE",
    "Indian stock market charts",
    "Bollinger bands NSE",
    "Supertrend indicator",
    "moving average crossover",
    "live stock charts India",
    "NSE BSE equity charts",
    "hammer pattern stocks",
    "morning star pattern",
    "candlestick pattern scanner",
    "options chain NSE",
    "F&O stocks",
    "stock breakout detection",
  ],

  authors: [{ name: "Riyaz Panarwala", url: BASE_URL }],
  creator: "Riyaz Panarwala",
  publisher: "Riyaz Panarwala",

  alternates: {
    canonical: BASE_URL,
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: "Riyaz Panarwala Stocks",
    title: "Free NSE & BSE Stock Charts with Technical Indicators",
    description:
      "Analyse 5000+ Indian stocks with interactive candlestick charts, RSI, MACD, Bollinger Bands, Supertrend, pattern detection, and fundamental data. Completely free.",
    images: [
      {
        url: `${BASE_URL}og-image.png`,
        width: 1200,
        height: 630,
        alt: "NSE BSE Stock Candlestick Charts – Riyaz Panarwala",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Free NSE & BSE Stock Charts | Technical Analysis",
    description:
      "Analyse 5000+ Indian stocks with RSI, MACD, Bollinger Bands, Supertrend, and 15+ indicators. Free candlestick charts with intraday & historical data.",
    images: [`${BASE_URL}og-image.png`],
    creator: "@riyazpanarwala",
    site: "@riyazpanarwala",
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  category: "finance",

  // Additional meta tags via `other`
  other: {
    "google-adsense-account": "", // add your AdSense ID if needed
    "theme-color": "#0a0e17",
    "color-scheme": "dark light",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Stock Charts",
    "application-name": "NSE BSE Charts",
    "format-detection": "telephone=no",
    "msapplication-TileColor": "#0a0e17",
    "msapplication-config": "/browserconfig.xml",
    "geo.region": "IN",
    "geo.placename": "India",
    language: "English",
    revisit: "7 days",
    rating: "general",
    "og:locale:alternate": "en_US",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e17" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Preconnect to external origins for performance (also helps SEO via Core Web Vitals) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://s3.tradingview.com" />
        <link rel="dns-prefetch" href="https://cdn-static.trendlyne.com" />
        <link rel="dns-prefetch" href="https://api.upstox.com" />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* <link rel="manifest" href="/manifest.json" /> -- Need to add -- */}
      </head>
      <body>
        {/* JSON-LD structured data */}
        <JsonLd />

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
                  send_page_view: true,
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
