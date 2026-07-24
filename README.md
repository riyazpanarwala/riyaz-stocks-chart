# Riyaz Stocks Chart 📈🇮🇳

A modern, high-performance Indian Stock Market (NSE & BSE) technical analysis, charting dashboard, and screening suite built with **Next.js 16** and **React 19**.

---

## 🚀 Features

- **📊 Advanced Financial & Candlestick Charting**: Powered by `@riyazpanarwala/react-financial-charts` and `Recharts` with custom candle rendering, multi-timeframe overlays, and interactive tooltips.
- **⚡ Technical Indicators & Signals**: Comprehensive indicator support with automated signal interpretation (Bullish / Bearish / Neutral):
  - Trend & Moving Averages: SMA (5, 10, 20, 50, 100, 200), EMA (50, 200), MA Crossovers, Supertrend, Chandelier Exit.
  - Momentum & Oscillators: RSI(14), MACD(12,26,9), Stochastic(20,3), CCI(20), Williams %R(14), ROC(20, 125).
  - Volatility & Trend Strength: Bollinger Bands(20,2), ADX/DMI (+DI, -DI), ATR & ATR SMA.
- **🔍 Pattern Recognition & Breakouts**: Automatic chart pattern detection, trendline breakouts, and custom annotations.
- **⛓️ Interactive Option Chain**: Option chain dashboard for NSE indices (NIFTY, BANKNIFTY, FINNIFTY) and stock options with Open Interest (OI) analysis.
- **⚙️ Stock Screener & Batch Analysis**: Built-in batch engine to run multi-indicator technical analysis across custom watchlists and export findings to JSON.
- **🏢 Fundamentals & Financial Analysis**: Detailed financial statements (P&L, Balance Sheet, Cash Flow), ratios, and valuation data via Yahoo Finance & NSE APIs.
- **🧮 Trading Utilities & Calculators**: Long/Short position size calculator, risk-reward manager, and angle calculation tools.
- **🌐 TradingView & Forex Views**: Embedded TradingView widgets for global market data and Forex pairs.
- **🔄 Automated Data Pipeline**: Autonomous scraping and downloading scripts for NSE equities, BSE equities (via Playwright stealth), ETF security lists, and F&O market lot sizes.
- **🎨 Modern Dark/Light Theme**: Built with Sass modules, Framer Motion animations, dynamic drop-downs, and virtualized tables for fast rendering.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| **Framework & UI** | Next.js 16 (App Router), React 19, Framer Motion, React Icons, React Select, React Window |
| **Charting Engine** | `@riyazpanarwala/react-financial-charts`, Recharts, D3 Format (`d3-format`, `d3-time-format`) |
| **Styling** | Sass (`.module.scss`, `.scss`), ThemeProvider (Dark/Light mode) |
| **Data APIs & Services** | `yahoo-finance2`, `stock-nse-india`, `@zero65tech/indian-stock-market`, Axios, Next.js API Routes |
| **Automation & Scraping** | Playwright (`playwright-extra`), `puppeteer-extra-plugin-stealth` |
| **Parsing & Utilities** | `react-papaparse` (CSV Parsing), `file-saver` (JSON Export) |

---

## 📋 Prerequisites

- **Node.js**: `24.11.1` (or `>= 20.0.0`)
- **npm**: `11.6.2` (or `>= 10.0.0`)

---

## ⚡ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/riyazpanarwala/riyaz-stocks-chart.git
cd riyaz-stocks-chart
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
|---|---|
| `npm run dev` | Launches the Next.js development server at `http://localhost:3000`. |
| `npm run build` | Compiles and optimizes the app for production deployment. |
| `npm run start` | Starts the production server (run after `npm run build`). |
| `npm run stockAnalysis` | Runs the node script to analyze watchlist equities and export indicator summaries. |
| `npm run updateMarketData` | Downloads latest NSE Equity list (`nse_equity.csv`), ETF list (`eq_etfseclist.csv`), and F&O Lot sizes (`fo_mktlots.csv`) to `public/`. |
| `npm run updateBseEquity` | Scrapes latest active BSE T+1 equities list (`bse_equity.csv`) to `public/` using Playwright in headless stealth mode. |

---

## 📁 Directory Structure

```text
riyaz-stocks-chart/
├── public/                 # Static assets & updated CSV market data (NSE/BSE)
├── scripts/                # Data pipeline scripts
│   ├── updateMarketData.mjs # Downloads NSE equity, ETF, and F&O lot data
│   └── updateBseEquity.mjs  # Playwright stealth script for BSE equity data
├── src/
│   ├── app/                # Next.js App Router pages and API routes
│   │   ├── api/            # API endpoints (Fundamentals, NSE Equity, Finance)
│   │   ├── optionchain/    # Option Chain analysis view
│   │   ├── riyazstock/     # Main stock chart & indicator dashboard
│   │   ├── TradingView/    # TradingView charts & Forex view
│   │   ├── layout.js       # Root app layout & provider wrapper
│   │   ├── page.js         # Homepage
│   │   ├── robots.js       # SEO robots configuration
│   │   └── sitemap.js      # Dynamic XML sitemap generator
│   ├── components/         # React components & visualization engines
│   │   ├── Calculator/     # Risk & position calculators
│   │   ├── Chandelier/     # Chandelier Exit technical view
│   │   ├── financeChart/   # Core financial candlestick chart engine & indicators
│   │   ├── FundaMentals/   # Company financial metrics & statement tables
│   │   ├── OptionChainNew/ # Option chain table & Greeks visualization
│   │   ├── StockAnalysis/  # Technical indicator calculations & batch screener
│   │   ├── TechnicalInfo/  # Technical summary panels
│   │   ├── Trendlyne/      # Trendlyne widget integration
│   │   └── utils/          # Watchlists & stock helpers
│   └── lib/                # Shared utilities & helpers
└── package.json            # Project dependencies and scripts
```

---

## 🚀 Deployment

To prepare and start the production build:

```bash
# Build the production bundle
npm run build

# Start production server
npm run start
```

The application is optimized for hosting on **Vercel** or any Node.js hosting environment.

---

## 📄 License & Notes

This repository is private and maintained for Indian stock market analysis, charting, and trading research.
