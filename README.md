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
- **🔄 Dynamic Market Universe & Instruments API**: Automatically synchronizes all active NSE & BSE equities, ETFs, F&O contracts, lot sizes, and indices via Upstox's official daily master contract CDN feed with 24-hour server ISR caching and zero Git commit churn.
- **🎨 Modern Dark/Light Theme**: Built with Sass modules, Framer Motion animations, dynamic drop-downs, and virtualized tables for fast rendering.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| **Framework & UI** | Next.js 16 (App Router), React 19, Framer Motion, React Icons, React Select, React Window |
| **Charting Engine** | `@riyazpanarwala/react-financial-charts`, Recharts, D3 Format (`d3-format`, `d3-time-format`) |
| **Styling** | Sass (`.module.scss`, `.scss`), ThemeProvider (Dark/Light mode) |
| **Data APIs & Services** | Upstox Market Data CDN, `yahoo-finance2`, `stock-nse-india`, `@zero65tech/indian-stock-market`, Axios, Next.js API Routes |
| **Instruments Pipeline** | Upstox Daily Master Contract Feeds (`NSE.json.gz`, `BSE.json.gz`), Next.js 24h ISR Caching |
| **Utilities** | `file-saver` (JSON Export), Node.js `zlib` stream decompression |

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
| `npm run updateInstruments` | Manually refreshes the local instrument snapshot from Upstox official CDN feeds. |

---

## 📁 Directory Structure

```text
riyaz-stocks-chart/
├── data/                   # Local instrument baseline cache (instruments.json)
├── public/                 # Static public assets
├── scripts/                # Analysis, backtest, and trading pipeline scripts
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

## 📈 Dynamic Instruments & Market Universe

The application dynamically manages the entire universe of Indian stock market instruments (over 13,000+ active securities across NSE, BSE, ETFs, F&O contracts, and indices) with zero daily Git commit noise:

1. **Official Upstox CDN Master Feeds**:
   - Master contract files are fetched directly from Upstox's high-speed CDN:
     - `https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz`
     - `https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz`
   - Covers active NSE equities, BSE equities, ETFs, F&O market lots/freeze quantities, and major index benchmarks.

2. **Server-Side ISR Caching (`/api/instruments`)**:
   - The Next.js Route Handler (`src/app/api/instruments/route.js`) caches compiled instruments for 24 hours (`revalidate = 86400`).
   - Client browsers fetch a single pre-compiled JSON payload (`~290 KB` gzipped) with pre-indexed search labels, completely removing the need to download and parse multiple large CSV files in the browser.

3. **Offline Development & Engine Support**:
   - A local baseline snapshot (`data/instruments.json`) is maintained so CLI commands (`npm run analyze -- <symbol>`) and unit test suites (`npm test`) execute offline with zero network latency.
   - To manually refresh the local baseline snapshot at any time, run:
     ```bash
     npm run updateInstruments
     ```

---

## 🤖 Google Gemini AI Integration

This repository includes a **generic, reusable, domain-agnostic Google Gemini AI integration** built on the official Google Gen AI SDK (`@google/genai`).

It is designed as a foundational AI infrastructure layer for the entire application, with **strictly server-side API key handling** and **internal-only consumption** guards to prevent exposure to external callers.

### 1. Setup

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. Add the key to your `.env` file (copy from `.env.example`):
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-3.6-flash
   ```
3. Start the application (`npm run dev`).

### 2. Available Integration Layers

The integration exposes two strictly internal consumption patterns:

| Layer | File Path | Usage Scenario |
|---|---|---|
| **Core Service** | `src/services/ai/geminiService.js` (also re-exported at `src/lib/ai/gemini.js`) | Direct server-side service calls within server actions, background services, and batch scripts. |
| **Server Action** | `src/app/actions/gemini.js` | Direct invocations from React components within this application using Next.js native RPC. |
| **Client Helper** | `src/lib/ai/geminiClient.js` | Browser-side utility (`askGemini(prompt, options)`) invoking the Server Action. |

> [!NOTE]
> **No Public REST API Route**: In accordance with Option B, no public `/api/ai/gemini` HTTP route is exposed to the internet. Attempting to call the endpoint from Postman, curl, or directly via browser address bar returns `404 Not Found`.

### 3. Server Action Example

#### Invocation: `askGeminiAction({ prompt, options })`

```javascript
import { askGeminiAction } from "@/app/actions/gemini.js";

// Basic Text Generation
const result = await askGeminiAction({
  prompt: "Explain recursion in JavaScript in simple terms."
});

if (result.success) {
  console.log(result.response);
}
```

#### Structured JSON Output Example

Pass `responseFormat: "json"` (and optionally `responseSchema`) to receive parsed JSON:

```javascript
const jsonResult = await askGeminiAction({
  prompt: "Return a JSON object containing title, summary, and keywords for a React article.",
  options: { responseFormat: "json" }
});

if (jsonResult.success) {
  console.log(jsonResult.response.title);
  console.log(jsonResult.response.keywords);
}
```

### 4. Client-Side Code Example

```javascript
import { askGemini } from "@/lib/ai/geminiClient.js";

// Text response
const result = await askGemini("Explain how WebSockets work in simple terms.");
if (result.success) {
  console.log(result.response);
}

// Structured JSON response
const jsonResult = await askGemini("Generate sample user profile", {
  responseFormat: "json"
});
```

Or using the Next.js Server Action:

```javascript
import { askGeminiAction } from "@/app/actions/gemini.js";

const result = await askGeminiAction({
  prompt: "Explain event loop in Node.js"
});
```

### 5. Security & Internal-Only Protection

- **Server-Side Exclusivity**: `GEMINI_API_KEY` is loaded strictly via server environment variables (`process.env.GEMINI_API_KEY`). It is never prefixed with `NEXT_PUBLIC_` and never reaches the browser.
- **Credential Redaction**: Error logs and API responses are automatically sanitized with key redaction filters to ensure credentials are never leaked.
- **Internal-Only Access**: Gemini is reachable only through the Next.js Server Action `askGeminiAction`. No public HTTP route is exposed, and Next.js action-ID and origin validation block cross-site requests.
- **Input Validation**: Prompts are constrained to a configurable maximum character length (50,000 chars) to prevent uncontrolled token consumption.

### 6. Generic Capabilities & Future Uses

Because the service contains **no domain-specific logic**, it is ready to power any future capability in the project:
- Document summarization and analysis
- Content generation and rewriting
- Natural language classification and intent detection
- Conversational chat / assistant features
- Code explanation and debugging assistance
- Data interpretation and report synthesis
- Multimodal document/image analysis where supported

### 7. Running Tests

Run all unit and integration tests (including Gemini test suite):

```bash
npm test
# or
npm run test:engine
```

---

## 📄 License & Notes

This repository is private and maintained for Indian stock market analysis, charting, and trading research.

