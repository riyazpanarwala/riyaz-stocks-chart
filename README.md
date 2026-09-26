# Riyaz Stocks Chart 📈🇮🇳

A modern, high-performance Indian Stock Market (NSE & BSE) technical analysis, charting dashboard, and screening suite built with **Next.js 16** and **React 19**.

---

## 🚀 Features

- **📊 Advanced Financial & Candlestick Charting**: Powered by `@riyazpanarwala/react-financial-charts` and `Recharts` with custom candle rendering, multi-timeframe overlays, and interactive tooltips.
- **🏷️ Corporate Actions on Charts**: Dividend and stock-split badges open an event-details modal. Events are mapped to daily, weekly, and monthly candles while retaining their original event dates, with keyboard focus handling for the popup.
- **⚡ Technical Indicators & Signals**: Comprehensive indicator support with automated signal interpretation (Bullish / Bearish / Neutral):
  - Trend & Moving Averages: SMA (5, 10, 20, 50, 100, 200), EMA (50, 200), MA Crossovers, Supertrend, Chandelier Exit.
  - Momentum & Oscillators: RSI(14), MACD(12,26,9), Stochastic(20,3), CCI(20), Williams %R(14), ROC(20, 125).
  - Volatility & Trend Strength: Bollinger Bands(20,2), ADX/DMI (+DI, -DI), ATR & ATR SMA.
- **🔍 Pattern Recognition & Breakouts**: Automatic chart pattern detection, trendline breakouts, and custom annotations.
- **⛓️ Interactive Option Chain**: Option chain dashboard for NSE indices (NIFTY, BANKNIFTY, FINNIFTY) and stock options with Open Interest (OI) analysis, side-aware strike buildup, support/resistance zones, and a Max Pain/PCR trend tracker. Includes Black-Scholes Delta, Gamma, Vega, daily Theta in points and rupees per lot, and an ATM straddle premium/expected-move band.
- **🕒 NIFTY Next-Day Option Signals**: NIFTY-only next-day panel in `/optionchain`, a deterministic signal engine with NO TRADE/data-unavailable guards, a 3:15 PM IST CLI scheduler, optional Telegram alerts, and an options backtest workflow.
- **🗺️ NSE Sector Heatmap & Market Breadth Dashboard (`/heatmap`)**: Real-time sectoral performance treemap/grid covering 12 major NSE sectors (Bank, IT, Auto, Pharma, FMCG, Metal, etc.) with constituent drilldowns, live Advance/Decline (A/D) ratios, 50/200 DMA trend health gauges, and 52-week High/Low balance meters. Built with 100% deterministic market data and zero AI dependency.
- **🌐 Market Sentiment & Macro Indicators (`/sentiment`)**: Real-time macro sentiment dashboard featuring official daily NSE FII/DII cash market investments (Buy, Sell, Net in ₹ Cr), India VIX Volatility & Risk Regime meter with actionable playbooks for equity and options traders, multi-index breadth distribution (NIFTY 50, 500, Midcap 100), and historical P/E valuation multiples.
- **⚙️ Stock Screener & Batch Analysis (`/screener`)**: Passcode-protected scanner with preset/custom watchlists, BUY/EXIT/WAIT filtering, technical analysis, and CLI JSON exports.
- **🤖 Pre-Market & Daily Briefing (`/briefing`)**: Passcode-protected market summaries, breadth, swing setups, and defensive positioning using Gemini with a quantitative fallback. Also available through the briefing CLI.
- **🧪 Strategy Research Engine**: Historical candle downloads and validation, multi-factor signals, ATR risk sizing, backtests, and historical paper-trading simulations.
- **🏢 Fundamentals & Financial Analysis**: Detailed financial statements (P&L, Balance Sheet, Cash Flow), ratios, and valuation data via Yahoo Finance & NSE APIs.
- **🧮 Trading Utilities & Calculators**: Long/Short position size calculator, risk-reward manager, and angle calculation tools.
- **🌐 TradingView & Forex Views**: Embedded TradingView widgets for global market data and Forex pairs.
- **🔄 Dynamic Market Universe & Instruments API**: Automatically synchronizes all active NSE & BSE equities, ETFs, F&O contracts, lot sizes, and indices via Upstox's official daily master contract CDN feed with 24-hour server caching and a local snapshot fallback.
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
| **AI** | Google Gen AI SDK (`@google/genai`), authenticated Server Actions, quantitative briefing fallback |
| **Analysis & Tests** | `technicalindicators`, custom strategy/backtest engines, Node.js test runner, ESLint |
| **Utilities** | `file-saver` (JSON Export), Node.js `zlib` stream decompression |

---

## 📋 Prerequisites

- **Node.js**: `24.11.1`
- **npm**: `11.6.2`

These are the versions declared in `package.json`.

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

### 3. Configure Environment

Copy `.env.example` to `.env` and configure the features you use:

| Variable | Purpose |
|---|---|
| `SCREENER_PASSWORDS` | Comma-separated access passcodes for the screener, briefing, and authenticated AI actions. |
| `SCREENER_SECRET_SALT` | Private, non-empty signing secret for access cookies. Access fails closed if this or the passcodes are missing. |
| `GEMINI_API_KEY` | Server-side key for Gemini generation and the live Gemini smoke test. |
| `GEMINI_MODEL` | Model selection; `.env.example` supplies the repository's example value. |
| `UPSTOX_ACCESS_TOKEN` | Token used by the engine's Upstox API adapter when downloading candle data. |
| `UPSTOX_REQUESTS_PER_SECOND`, `UPSTOX_MAX_RETRIES` | Optional engine request tuning; defaults are `10` and `4`. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional destination credentials for next-day signal alerts. |

The Upstox and Telegram variables are optional additions to `.env.example`. Next.js loads environment files; only CLI commands that explicitly use `--env-file` or `--env-file-if-exists` load `.env` automatically. For other CLI commands, export variables in the shell or invoke Node with `--env-file=.env`.

### 4. Start Development Server

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
| `npm run analyze -- [SYMBOL] [--holding] [--bse] [--timeframe=1d]` | Same analyzer as `stockAnalysis`; omitting the symbol runs the default watchlist and exports JSON. |
| `npm run scan -- [TCS,INFY]` | Scans the default or supplied comma-separated watchlist for BUY/EXIT setups. |
| `npm run fetchData -- <SYMBOL_OR_KEY> <fromDate> <toDate> [timeframe]` | Downloads candle datasets into `data/`. |
| `npm run signal -- <dataset.json> [--holding]` | Generates a strategy signal from a saved dataset. |
| `npm run backtest -- <dataset.json> [output.json]` | Runs the strategy backtest; default output is `data/backtest-result.json`. |
| `npm run paperTrade -- <SYMBOL> [--capital=50000] [--sizing=risk] [--risk=1]` | Simulates historical trades with configurable sizing and trailing stops. |
| `npm run briefing -- [TCS,INFY] [--no-save] [--json]` | Generates a daily briefing; loads `.env` and saves a Markdown report by default. |
| `npm run signal:315 -- [--refresh] [--json] [--telegram]` | Generates the NIFTY next-day report; Telegram dispatch requires the explicit flag. |
| `npm run schedule:315` | Runs a persistent 15:15 IST scheduler, saves reports, and attempts Telegram dispatch. |
| `npm run backtest:options -- [dataset.json] [--days 120] [--synthetic]` | Backtests the next-day options engine; synthetic data requires an explicit flag. |
| `npm run lint` | Runs ESLint on `src/`. |
| `npm test` / `npm run test:engine` | Runs the Node test suites in `test/engine/`. |
| `npm run test:gemini` | Live Gemini API smoke test; requires `.env` and a valid API key. |
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
│   │   ├── api/            # Instruments, heatmap, and sentiment endpoints
│   │   ├── actions/        # Finance, AI, access control, and signal Server Actions
│   │   ├── briefing/       # Protected daily market briefing
│   │   ├── screener/       # Protected watchlist scanner
│   │   ├── heatmap/        # Sector performance and market breadth
│   │   ├── sentiment/      # Macro sentiment, VIX, FII/DII, valuations
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
│   ├── engine/             # Data adapters, indicators, signals, risk, backtests
│   ├── services/           # Finance, AI, market data, Telegram services
│   └── lib/                # Shared helpers and instrument snapshot/cache
├── test/engine/            # Automated regression suites
├── .env.example            # AI and access-control configuration template
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

The Next.js application can be hosted on **Vercel** or a Node.js hosting environment. Configure the required environment variables on the host.

`npm run schedule:315` is a separate, long-running Node process: keep it running on a persistent worker/host. Starting the web app does not start this scheduler. It skips weekends and holidays according to the repository's market calendar, saves JSON/Markdown reports under `reports/next-day-signals/`, and attempts Telegram delivery when credentials are configured. The browser signal panel does not send alerts or save reports.

The options backtest labels runs based on underlying OHLC as a price proxy; those results do not represent historical option-premium fills. Synthetic input is available only with `--synthetic`.

---

## 📈 Dynamic Instruments & Market Universe

The application builds its searchable market universe from Upstox NSE/BSE instrument feeds, including equity, ETF, index, and F&O metadata:

1. **Official Upstox CDN Master Feeds**:
   - Master contract files are fetched directly from Upstox's high-speed CDN:
     - `https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz`
     - `https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz`
   - Covers active NSE equities, BSE equities, ETFs, F&O market lots/freeze quantities, and major index benchmarks.

2. **Server-Side ISR Caching (`/api/instruments`)**:
   - The Next.js Route Handler (`src/app/api/instruments/route.js`) caches compiled instruments for 24 hours (`revalidate = 86400`).
   - Client browsers fetch a single compiled JSON payload with pre-indexed search labels, completely removing the need to download and parse multiple large CSV files in the browser.

3. **Offline Development & Engine Support**:
   - A local baseline snapshot (`data/instruments.json`) supports instrument lookup and fallback when the feeds are unavailable. Analysis still needs market candles; the snapshot does not make live analysis offline.
   - Successful feed refreshes write the snapshot when the filesystem permits, so `data/instruments.json` can appear as a local Git change.
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

The integration provides three consumption layers:

| Layer | File Path | Usage Scenario |
|---|---|---|
| **Core Service** | `src/services/ai/geminiService.js` (also re-exported at `src/lib/ai/gemini.js`) | Direct server-side service calls within server actions, background services, and batch scripts. |
| **Server Action** | `src/app/actions/gemini.js` | Direct invocations from React components within this application using Next.js native RPC. |
| **Client Helper** | `src/lib/ai/geminiClient.js` | Browser-side utility (`askGemini(prompt, options)`) invoking the Server Action. |

> [!NOTE]
> **No Public REST API Route**: No dedicated `/api/ai/gemini` HTTP route is exposed to the internet. Attempting to call the endpoint from Postman, curl, or directly via browser address bar returns `404 Not Found`.

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
- **Authenticated Browser Access**: `askGeminiAction` checks the signed screener session, validates prompts and allowed options, and applies an in-memory per-client limit of 30 requests per minute. There is no dedicated Gemini REST route. Server-side services and CLI scripts can call the core service directly.
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

Run the automated engine and regression suites (including Gemini service/action tests):

```bash
npm test
# or
npm run test:engine
```

---

## ✅ Validation Coverage

The suites in `test/engine/` cover candle validation and live-candle handling, indicators, strategy/backtest logic, instrument resolution, authenticated actions, Gemini integration, briefing, heatmap/breadth, macro sentiment, option-chain signals, Max Pain/PCR, Greeks/straddle calculations, next-day option signals, and corporate-action mapping/chart badges.

`npm run test:gemini` is a separate live API check. Regular tests and lint can be run without sending Telegram alerts or starting the scheduler.

---

## 📄 License & Notes

This repository is private and maintained for Indian stock market analysis, charting, and trading research.

