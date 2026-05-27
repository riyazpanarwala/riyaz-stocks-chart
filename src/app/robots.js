// src/app/robots.js
// Next.js App Router serves this automatically at /robots.txt

import { SITE_URL } from "../lib/siteConfig";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/TradingView", "/optionchain"],
        disallow: [
          "/api/",
          "/riyazstock", // internal bulk-analysis tool
          "/*.json$", // block raw JSON files
          "/api/NSE/",
          "/api/finance/",
          "/api/Fundamentals/",
        ],
      },
      // Allow Google's image bot to index OG images
      {
        userAgent: "Googlebot-Image",
        allow: ["/og-image.png", "/apple-touch-icon.png"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
