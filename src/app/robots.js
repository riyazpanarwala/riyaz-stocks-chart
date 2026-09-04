// src/app/robots.js
// Next.js App Router serves this automatically at /robots.txt

import { SITE_URL } from "../lib/siteConfig";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/screener", "/TradingView", "/TradingView/forex", "/optionchain"],
        disallow: [
          "/riyazstock", // internal bulk-analysis tool
        ],

      },
      // Allow Google's image bot to index OG images and favicons
      {
        userAgent: "Googlebot-Image",
        allow: ["/og-image.png", "/apple-touch-icon.png", "/favicon.svg", "/favicon-32x32.png"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
