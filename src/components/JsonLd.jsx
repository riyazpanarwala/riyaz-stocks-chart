// src/components/JsonLd.jsx
// Structured data (JSON-LD) for rich search results

import { SITE_URL } from "../lib/siteConfig";

export default function JsonLd() {
  const brandSchema = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: "Panarwala",
    alternateName: ["Panarwala Stocks", "Riyaz Panarwala Stocks"],
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    description:
      "Panarwala is a premier brand for free financial charting tools, NSE & BSE stock analysis, options chain analytics, and technical market insights.",
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Panarwala Stocks",
    legalName: "Panarwala Stocks",
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    founder: {
      "@type": "Person",
      name: "Riyaz Panarwala",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Panarwala Stocks",
    alternateName: ["Panarwala Stock Charts", "NSE BSE Stock Charts - Panarwala"],
    url: SITE_URL,
    description:
      "Panarwala Stocks provides free interactive candlestick charts for Indian stocks. Analyze NSE/BSE data with RSI, MACD, Bollinger Bands, moving averages, and 15+ technical indicators.",
    publisher: {
      "@type": "Organization",
      name: "Panarwala Stocks",
      url: SITE_URL,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?symbol={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Panarwala NSE BSE Stock Chart Analyzer",
    alternateName: "Panarwala Stock Charts",
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    description:
      "Panarwala's professional-grade candlestick charting tool for Indian equity markets with real-time NSE and BSE data, technical indicators, and pattern detection.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    featureList: [
      "Panarwala Live NSE and BSE candlestick charts",
      "RSI, MACD, Bollinger Bands indicators",
      "Moving average crossovers",
      "Supertrend indicator",
      "Intraday and historical data",
      "Pattern detection (Hammer, Doji, Engulfing, etc.)",
      "Breakout detection",
      "Technical analysis summary",
      "Fundamental data",
      "Watchlist management",
    ],
    author: {
      "@type": "Person",
      name: "Riyaz Panarwala",
      url: SITE_URL,
    },
    provider: {
      "@type": "Organization",
      name: "Panarwala Stocks",
      url: SITE_URL,
    },
  };

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Riyaz Panarwala",
    url: SITE_URL,
    jobTitle: "Founder & Developer",
    worksFor: {
      "@type": "Organization",
      name: "Panarwala Stocks",
    },
    sameAs: [],
    knowsAbout: [
      "Panarwala Stock Charts",
      "Stock Market Analysis",
      "Technical Analysis",
      "NSE Trading",
      "BSE Trading",
      "Indian Stock Market",
      "Candlestick Charts",
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
    ],
  };

  const schemas = [
    brandSchema,
    organizationSchema,
    websiteSchema,
    webAppSchema,
    personSchema,
    breadcrumbSchema,
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
