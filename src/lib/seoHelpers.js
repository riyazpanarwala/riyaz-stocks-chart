// src/lib/seoHelpers.js
// Reusable SEO metadata generators for per-stock and per-page routes.

import { SITE_URL } from "./siteConfig";

/**
 * Generate Next.js `metadata` object for a specific stock symbol.
 * Use if you add dynamic stock pages.
 *
 * @param {string} symbol  - e.g. "RELIANCE"
 * @param {string} name    - e.g. "Reliance Industries Ltd"
 * @param {string} exchange - e.g. "NSE" | "BSE"
 * @param {string} stockUrl - absolute canonical URL for the stock page
 */
export function generateStockMetadata(
  symbol,
  name,
  exchange = "NSE",
  stockUrl,
) {
  if (!stockUrl) throw new Error("stockUrl is required for stock metadata");

  const title = `${name} (${symbol}) Stock Chart | ${exchange} Candlestick & Technical Analysis`;
  const description = `View live ${exchange} candlestick chart for ${name} (${symbol}). Analyse with RSI, MACD, Bollinger Bands, Supertrend, and 15+ technical indicators. Free intraday and historical data.`;

  return {
    title,
    description,
    keywords: [
      `${symbol} stock chart`,
      `${symbol} ${exchange} chart`,
      `${name} candlestick chart`,
      `${symbol} RSI MACD`,
      `${symbol} technical analysis`,
      `${name} share price chart`,
      `${exchange} ${symbol}`,
      "NSE BSE stock charts",
      "Indian stock technical analysis",
    ],
    alternates: {
      canonical: stockUrl,
    },
    openGraph: {
      title,
      description,
      url: stockUrl,
      type: "website",
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${name} stock chart`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

/**
 * Generate structured data (JSON-LD) for a specific stock page.
 * Include via <script type="application/ld+json"> in the page component.
 *
 * @param {string} symbol
 * @param {string} name
 * @param {string} exchange
 * @param {number|null} currentPrice
 * @param {string} stockUrl
 */
export function generateStockJsonLd(
  symbol,
  name,
  exchange = "NSE",
  currentPrice = null,
  stockUrl,
) {
  if (!stockUrl) throw new Error("stockUrl is required for stock JSON-LD");

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${name} (${symbol}) Stock Chart`,
    description: `Interactive candlestick chart and technical analysis for ${name} listed on ${exchange}.`,
    url: stockUrl,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: `${symbol} Chart`,
          item: stockUrl,
        },
      ],
    },
    mainEntity: {
      "@type": "FinancialProduct",
      name,
      tickerSymbol: symbol,
      exchange,
      ...(currentPrice != null && {
        offers: {
          "@type": "Offer",
          price: currentPrice,
          priceCurrency: "INR",
        },
      }),
    },
  };

  return JSON.stringify(schema);
}

/**
 * Returns a plain-text description of the current chart state.
 * Useful for aria-label attributes on the chart canvas.
 *
 * @param {string} companyName
 * @param {string} indicator
 * @param {string} interval
 * @param {string} period
 */
export function getChartAriaLabel(companyName, indicator, interval, period) {
  return `${companyName} candlestick chart showing ${interval} candles over ${period} with ${indicator} indicator`;
}
