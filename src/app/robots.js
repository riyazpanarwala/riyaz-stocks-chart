// src/app/robots.js
// Next.js App Router automatically serves this at /robots.txt

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://riyaz-stocks-chart.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
