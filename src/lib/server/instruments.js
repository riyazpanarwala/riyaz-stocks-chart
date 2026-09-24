// src/lib/server/instruments.js
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const UPSTOX_NSE_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const UPSTOX_BSE_URL = "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const DATA_DIR = path.resolve(process.cwd(), "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "instruments.json");

export const INDICES_ARR = [
  { name: "NIFTY 50", value: "Nifty 50", symbol: "NIFTY 50", yahooSymbol: "^NSEI" },
  { name: "NIFTY BANK", value: "Nifty Bank", symbol: "NIFTY BANK", yahooSymbol: "^NSEBANK" },
  { name: "NIFTY MIDCAP 100", value: "NIFTY MIDCAP 100", symbol: "NIFTY MIDCAP 100", yahooSymbol: "NIFTY_MIDCAP_100.NS" },
  { name: "NIFTY SMALLCAP 100", value: "NIFTY SMLCAP 100", symbol: "NIFTY SMALLCAP 100" },
  { name: "NIFTY ENERGY", value: "Nifty Energy", symbol: "NIFTY ENERGY", yahooSymbol: "^CNXENERGY" },
  { name: "INDIA VIX", value: "India VIX", symbol: "India VIX", upstoxOnly: true },
];

export const GLOBAL_INSTRUMENTS = [
  { name: "GIFT NIFTY", value: "SGX NIFTY", symbol: "SGX NIFTY", segment: "GLOBAL_INDEX" },
  { name: "DOW JONES", value: "^DJI", symbol: "^DJI", segment: "GLOBAL_INDEX" },
  { name: "US 30", value: "DOW FUTURES", symbol: "DOW FUTURES", segment: "GLOBAL_INDEX" },
  { name: "S&P 500", value: "^GSPC", symbol: "^GSPC", segment: "GLOBAL_INDEX" },
  { name: "US Tech 100", value: "IXIX", symbol: "IXIX", segment: "GLOBAL_INDEX" },
  { name: "FTSE 100", value: "^FTSE", symbol: "^FTSE", segment: "GLOBAL_INDEX" },
  { name: "DAX", value: "^GDAXI", symbol: "^GDAXI", segment: "GLOBAL_INDEX" },
  { name: "CAC 40", value: "^FCHI", symbol: "^FCHI", segment: "GLOBAL_INDEX" },
  { name: "HANG SENG", value: "^HSI", symbol: "^HSI", segment: "GLOBAL_INDEX" },
  { name: "NIKKEI 225", value: "^N225", symbol: "^N225", segment: "GLOBAL_INDEX" },
  { name: "USD/INR", value: "USDINR", symbol: "USDINR", segment: "GLOBAL_INDICATOR" },
  { name: "Oil (Brent)", value: "BZUSD", symbol: "BZUSD", segment: "GLOBAL_INDICATOR" },
  { name: "Oil (WTI)", value: "CLUSD", symbol: "CLUSD", segment: "GLOBAL_INDICATOR" },
];

export const BSE_INDICES_ARR = [
  { name: "SENSEX", value: "SENSEX", symbol: "SENSEX", yahooSymbol: "^BSESN" },
];

let inMemoryCache = null;
let lastFetchedTime = 0;
let pendingFetchPromise = null;

async function fetchAndUnzipJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "application/json,application/octet-stream,*/*",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const unzipped = zlib.gunzipSync(buffer);
  return JSON.parse(unzipped.toString("utf8"));
}

function buildMergedInstruments(nseInstruments, bseInstruments) {
  const merged = [];
  const bseIsinSet = new Set();
  const bseCodeMap = new Map();
  const bseByCode = {};
  const bseById = {};
  const nseBySymbol = {};
  const isinMap = {};

  // Index BSE equities
  bseInstruments.forEach((item) => {
    if (item.segment === "BSE_EQ" && item.isin && item.exchange_token) {
      const isin = item.isin.trim();
      const rawCode = String(item.exchange_token).trim();
      const code = (isin === "INE721I01024" && rawCode.startsWith("20000")) ? "544937" : rawCode;
      const symbol = (item.trading_symbol || code).trim().toUpperCase();
      const name = item.name || symbol;

      bseIsinSet.add(isin);
      bseCodeMap.set(isin, code);

      const bseRecord = {
        symbol,
        code,
        name,
        isin,
        exchange: "BSE",
        instrumentKey: `BSE_EQ|${isin}`,
      };

      bseByCode[code] = bseRecord;
      if (rawCode !== code) {
        bseByCode[rawCode] = bseRecord;
      }
      if (symbol) bseById[symbol] = bseRecord;
      if (!isinMap[isin]) isinMap[isin] = bseRecord;
    }
  });

  const nseIsinSet = new Set();

  // Process NSE Equities
  nseInstruments.forEach((item) => {
    if (
      item.segment === "NSE_EQ" &&
      item.isin &&
      item.trading_symbol &&
      !item.isin.startsWith("INF")
    ) {
      const isin = item.isin.trim();
      const symbol = item.trading_symbol.trim().toUpperCase();
      const name = item.name || symbol;

      // Filter standard equity series
      if (["EQ", "BE", "BZ", "SM", "ST"].includes(item.instrument_type)) {
        nseIsinSet.add(isin);

        const nseRecord = {
          symbol,
          name,
          isin,
          exchange: "NSE",
          instrumentKey: `NSE_EQ|${isin}`,
        };
        nseBySymbol[symbol] = nseRecord;
        isinMap[isin] = nseRecord;

        const hasBse = bseIsinSet.has(isin);
        const bseCode = bseCodeMap.get(isin);

        merged.push({
          label: name,
          value: isin,
          symbol,
          nse: true,
          bse: hasBse,
          ...(bseCode ? { bseCode } : {}),
          _lowerLabel: name.toLowerCase(),
          _lowerSymbol: symbol.toLowerCase(),
        });
      }
    }
  });

  // Process BSE Equities not in NSE
  bseInstruments.forEach((item) => {
    if (
      item.segment === "BSE_EQ" &&
      item.isin &&
      item.exchange_token &&
      !item.isin.startsWith("INF")
    ) {
      const isin = item.isin.trim();
      if (!nseIsinSet.has(isin)) {
        const rawCode = String(item.exchange_token).trim();
        const code = (isin === "INE721I01024" && rawCode.startsWith("20000")) ? "544937" : rawCode;
        const symbol = (item.trading_symbol || code).trim().toUpperCase();
        const name = item.name || symbol;

        merged.push({
          label: name,
          value: isin,
          symbol,
          bseCode: code,
          nse: false,
          bse: true,
          _lowerLabel: name.toLowerCase(),
          _lowerSymbol: symbol.toLowerCase(),
        });
      }
    }
  });

  // Add NSE Indices
  INDICES_ARR.forEach((v) => {
    const label = String(v.name || "").trim();
    const symbol = String(v.symbol || "").trim();
    merged.push({
      label,
      value: v.value,
      symbol,
      nse: false,
      bse: false,
      nseIndex: true,
      yahooSymbol: v.yahooSymbol,
      upstoxOnly: v.upstoxOnly,
      _lowerLabel: label.toLowerCase(),
      _lowerSymbol: symbol.toLowerCase(),
    });
  });

  // Add Global Instruments
  GLOBAL_INSTRUMENTS.forEach((v) => {
    const label = String(v.name || "").trim();
    const symbol = String(v.symbol || "").trim();
    merged.push({
      label,
      value: v.value,
      symbol,
      global: true,
      globalSegment: v.segment,
      upstoxOnly: true,
      _lowerLabel: label.toLowerCase(),
      _lowerSymbol: symbol.toLowerCase(),
    });
  });

  // Add BSE Indices
  BSE_INDICES_ARR.forEach((v) => {
    const label = String(v.name || "").trim();
    const symbol = String(v.symbol || "").trim();
    merged.push({
      label,
      value: v.value,
      symbol,
      bseIndex: true,
      yahooSymbol: v.yahooSymbol,
      _lowerLabel: label.toLowerCase(),
      _lowerSymbol: symbol.toLowerCase(),
    });
  });

  // Add ETFs
  nseInstruments.forEach((item) => {
    if (
      item.segment === "NSE_EQ" &&
      (item.instrument_type === "ETF" || item.isin?.startsWith("INF"))
    ) {
      const isin = item.isin.trim();
      const symbol = item.trading_symbol.trim().toUpperCase();
      const name = item.name || symbol;

      merged.push({
        label: name,
        value: isin,
        symbol,
        nse: true,
        bse: bseIsinSet.has(isin),
        etf: true,
        indexName: "NSE_EQ",
        _lowerLabel: name.toLowerCase(),
        _lowerSymbol: symbol.toLowerCase(),
      });
    }
  });

  // Extract F&O symbols & lots
  const foLots = {};
  const foSymbolsSet = new Set();

  nseInstruments.forEach((item) => {
    if (item.segment === "NSE_FO" && item.instrument_type === "FUT") {
      const sym = (item.underlying_symbol || item.asset_symbol || "").trim().toUpperCase();
      if (sym) {
        foSymbolsSet.add(sym);
        if (item.lot_size && !foLots[sym]) {
          foLots[sym] = item.lot_size;
        }
      }
    }
  });

  const foSymbols = Array.from(foSymbolsSet);

  return {
    instruments: merged,
    foSymbols,
    foLots,
    universe: {
      nseBySymbol,
      bseByCode,
      bseById,
      isinMap,
      nseCount: Object.keys(nseBySymbol).length,
      bseCount: Object.keys(bseByCode).length,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads baseline snapshot from data/instruments.json
 */
export function loadLocalSnapshot() {
  if (fs.existsSync(SNAPSHOT_FILE)) {
    try {
      const content = fs.readFileSync(SNAPSHOT_FILE, "utf8");
      return JSON.parse(content);
    } catch (err) {
      console.warn("Failed to read snapshot file:", err.message);
    }
  }
  return null;
}

/**
 * Saves snapshot to data/instruments.json
 */
export function saveLocalSnapshot(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const compact = {
      instruments: data.instruments,
      foSymbols: data.foSymbols,
      foLots: data.foLots,
      updatedAt: data.updatedAt,
    };
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(compact), "utf8");
  } catch (err) {
    console.warn("Failed to save snapshot file:", err.message);
  }
}

/**
 * Get unified instruments with caching and fallback.
 */
export async function getUnifiedInstruments({ forceRefresh = false } = {}) {
  const now = Date.now();

  if (!forceRefresh && inMemoryCache && now - lastFetchedTime < CACHE_TTL_MS) {
    return inMemoryCache;
  }

  if (pendingFetchPromise) {
    return pendingFetchPromise;
  }

  pendingFetchPromise = (async () => {
    try {
      console.log("Fetching live instrument master feeds from Upstox CDN...");
      const [nseInstruments, bseInstruments] = await Promise.all([
        fetchAndUnzipJson(UPSTOX_NSE_URL),
        fetchAndUnzipJson(UPSTOX_BSE_URL),
      ]);

      const compiled = buildMergedInstruments(nseInstruments, bseInstruments);
      inMemoryCache = compiled;
      lastFetchedTime = Date.now();
      saveLocalSnapshot(compiled);
      console.log(
        `✔ Unified instruments compiled successfully (${compiled.instruments.length} instruments, ${compiled.foSymbols.length} F&O symbols)`
      );
      return compiled;
    } catch (err) {
      console.warn("Failed to fetch Upstox feeds:", err.message);

      // Fallback to local snapshot
      const snapshot = loadLocalSnapshot();
      if (snapshot) {
        console.log("Using local snapshot data/instruments.json fallback.");
        inMemoryCache = snapshot;
        lastFetchedTime = Date.now();
        return snapshot;
      }

      throw err;
    } finally {
      pendingFetchPromise = null;
    }
  })();

  return pendingFetchPromise;
}
