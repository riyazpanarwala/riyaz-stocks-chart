# Riyaz Stocks Chart

A Next.js-based Indian stock market dashboard for NSE/BSE candlestick charts, technical indicators, live market analysis, and screening tools.

## Features

- Interactive candlestick charting for NSE and BSE stocks
- Technical indicators including RSI, MACD, Bollinger Bands, Supertrend, SMA, EMA, and more
- Candlestick pattern scanner and breakout/trendline detection
- Stock fundamentals, option chain, and live market data pages
- Multiple chart views, custom indicators, and Indian market-specific datasets
- Built with ECharts, Recharts, React Select, and modern React/Next.js

## Getting Started

### Prerequisites

- Node.js `24.11.1` or newer
- npm `11.6.2` or newer

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - start the Next.js development server
- `npm run build` - build the application for production
- `npm run start` - run the production server after build
- `npm run stockAnalysis` - execute the stock analysis node script

## Project Structure

- `src/app/` - Next.js app routes and page metadata
- `src/components/` - UI components, charts, analysis tools, and helpers
- `public/` - static assets, market data CSV files, icons, and manifest

## Technology Stack

- Next.js 16
- React 19
- @riyazpanarwala/react-financial-charts for charting
- Sass for component styling
- Yahoo Finance, NSE, and Indian stock market data packages

## Deployment

Build and start the app for production:

```bash
npm run build
npm run start
```

For hosting, Vercel is a recommended platform for Next.js apps.

## Notes

This repository is configured as a private app and includes Indian stock market utilities, charts, and technical analysis features for NSE/BSE equities.
