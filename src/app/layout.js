import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOOGLE_ANALYTICS_GA_ID } from "../components/config";
import ThemeProvider from "../components/ThemeProvider";

import "./globals.css";

export const metadata = {
  title: "Riyaz Panarwala | Live NSE & BSE Stock Charts",
  description:
    "Analyze Indian stocks with live NSE & BSE candlestick charts and technical indicators.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
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
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
