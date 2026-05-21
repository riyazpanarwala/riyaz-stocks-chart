// src/app/robots.js
// Next.js App Router serves this automatically at /robots.txt

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://riyaz-stocks-chart.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/chart", "/TradingView", "/optionchain"],
        disallow: [
          "/api/",
          "/_next/",
          "/riyazstock",          // internal bulk-analysis tool
          "/*.json$",             // block raw JSON files
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
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
