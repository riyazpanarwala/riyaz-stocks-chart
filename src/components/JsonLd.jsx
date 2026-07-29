// src/components/JsonLd.jsx
// Structured data (JSON-LD) for rich search results

import { SITE_URL } from "../lib/siteConfig";

export default function JsonLd({ includeFaq = false }) {
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I view live NSE stock charts on Panarwala Stocks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "On Panarwala Stocks, select any NSE stock from the search dropdown, choose 'Intraday' mode, and pick your preferred time interval. The candlestick chart updates automatically during market hours.",
        },
      },
      {
        "@type": "Question",
        name: "Which technical indicators are available on Panarwala Stocks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Panarwala Stocks supports RSI(14), MACD(12,26,9), Bollinger Bands(20,2), Stochastic(20,3), CCI(20), MFI(14), ADX/DMI, Supertrend, OBV, EMA, SMA crossovers, and Zero-Lag MACD.",
        },
      },
      {
        "@type": "Question",
        name: "Is Panarwala Stock Charts free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Panarwala Stock Charts is 100% free for all users. You can analyze NSE and BSE stocks, view technical indicators, detect candlestick patterns, and check fundamental data at zero cost.",
        },
      },
      {
        "@type": "Question",
        name: "Can I view BSE stock charts on Panarwala Stocks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. After selecting a company on Panarwala Stocks, use the index selector to switch between NSE and BSE. Stocks listed on both exchanges will display live data for either exchange.",
        },
      },
      {
        "@type": "Question",
        name: "How do I use the Panarwala candlestick pattern scanner?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open the Pattern menu in the sidebar on Panarwala Stocks and select any pattern such as Hammer, Morning Star, Engulfing, Doji, or Marubozu. The chart will highlight all detected occurrences on historical data.",
        },
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
    ...(includeFaq ? [faqSchema] : []),
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
