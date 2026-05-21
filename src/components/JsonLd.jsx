// src/components/JsonLd.jsx
// Structured data (JSON-LD) for rich search results

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://riyaz-stocks-chart.vercel.app";

export default function JsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Riyaz Panarwala Stocks",
    alternateName: "NSE BSE Stock Charts",
    url: BASE_URL,
    description:
      "Free interactive candlestick charts for Indian stocks. Analyze NSE/BSE data with RSI, MACD, Bollinger Bands, moving averages, and 15+ technical indicators.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "NSE BSE Stock Chart Analyzer",
    url: BASE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    description:
      "Professional-grade candlestick charting tool for Indian equity markets with real-time NSE and BSE data, technical indicators, and pattern detection.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    featureList: [
      "Live NSE and BSE candlestick charts",
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
      url: BASE_URL,
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Riyaz Panarwala",
    url: BASE_URL,
    sameAs: [],
    knowsAbout: [
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
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Stock Charts",
        item: `${BASE_URL}/chart`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "TradingView Charts",
        item: `${BASE_URL}/TradingView`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Option Chain",
        item: `${BASE_URL}/optionchain`,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I view live NSE stock charts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Select any NSE stock from the dropdown, choose 'Intraday' mode, and pick your preferred time interval (1min, 5min, 15min, 30min). The chart updates automatically during market hours.",
        },
      },
      {
        "@type": "Question",
        name: "Which technical indicators are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The platform supports RSI(14), MACD(12,26,9), Bollinger Bands(20,2), Stochastic(20,3), CCI(20), MFI(14), ADX/DMI, Supertrend, OBV, EMA, SMA crossovers, and Zero-Lag MACD.",
        },
      },
      {
        "@type": "Question",
        name: "Is this stock chart tool free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, the NSE and BSE candlestick chart tool is completely free. You can analyze stocks, view technical indicators, detect patterns, and check fundamental data at no cost.",
        },
      },
      {
        "@type": "Question",
        name: "Can I view BSE stock charts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. After selecting a company, use the index selector to switch between NSE and BSE. Stocks listed on both exchanges will show both options.",
        },
      },
      {
        "@type": "Question",
        name: "How do I use the candlestick pattern scanner?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open the Pattern menu in the sidebar and select any pattern such as Hammer, Morning Star, Engulfing, Doji, or Marubozu. The chart will highlight all detected occurrences on the historical data.",
        },
      },
    ],
  };

  const schemas = [
    websiteSchema,
    webAppSchema,
    organizationSchema,
    breadcrumbSchema,
    faqSchema,
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
