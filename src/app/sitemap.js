// src/app/sitemap.js
// Next.js App Router serves this automatically at /sitemap.xml

import { SITE_URL } from "../lib/siteConfig";

export default function sitemap() {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/optionchain`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/TradingView`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/TradingView/forex`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];
}
