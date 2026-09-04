import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const DEFAULT_ALIASES = Object.freeze({
  "UTI NIFTY NEXT 50": "NEXT50BETA",
  "UTI NIFTY NEXT 50 ETF": "NEXT50BETA",
  UTINEXT50: "NEXT50BETA",
  ZOMATO: "ETERNAL",
  TATAMOTORS: "TMPV",
  LTIM: "LTM",
  LTIMINDTREE: "LTM",
  GMRINFRA: "GMRAIRPORT"
});

const NAME_OVERRIDES = Object.freeze({
  LTM: "LTIMindtree Limited"
});


let universeCache = null;

function getPublicDir() {
  const defaultDir = path.join(process.cwd(), "public");
  if (fs.existsSync(defaultDir) && fs.existsSync(path.join(defaultDir, "nse_equity.csv"))) {
    return defaultDir;
  }
  try {
    const fileDir = path.resolve(fileURLToPath(import.meta.url), "../../../../public");
    if (fs.existsSync(fileDir)) return fileDir;
  } catch {
    // ignore
  }
  return defaultDir;
}


function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function getUniverse(options = {}) {
  if (universeCache && !options.forceReload) {
    return universeCache;
  }

  const publicDir = options.publicDir || getPublicDir();
  const nseCsvPath = path.join(publicDir, "nse_equity.csv");
  const bseCsvPath = path.join(publicDir, "bse_equity.csv");

  const nseBySymbol = new Map();
  const bseByCode = new Map();
  const bseById = new Map();
  const isinMap = new Map();

  // 1. Load NSE equities
  if (fs.existsSync(nseCsvPath)) {
    try {
      const content = fs.readFileSync(nseCsvPath, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const cols = parseCsvLine(line);
        const symbol = cols[0]?.toUpperCase();
        const name = cols[1];
        const isin = cols[6];
        if (symbol && isin && isin.startsWith("IN")) {
          const item = Object.freeze({
            symbol,
            name: name || symbol,
            isin,
            exchange: "NSE",
            instrumentKey: `NSE_EQ|${isin}`
          });
          nseBySymbol.set(symbol, item);
          if (!isinMap.has(isin)) isinMap.set(isin, item);
        }
      }
    } catch (err) {
      console.warn("Failed to parse nse_equity.csv:", err.message);
    }
  }

  // 2. Load BSE equities
  if (fs.existsSync(bseCsvPath)) {
    try {
      const content = fs.readFileSync(bseCsvPath, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const cols = parseCsvLine(line);
        const code = cols[0]?.trim();
        const issuerName = cols[1]?.trim();
        const securityId = cols[2]?.trim()?.toUpperCase();
        const isin = cols[7]?.trim();
        if (code && isin && isin.startsWith("IN")) {
          const item = Object.freeze({
            symbol: securityId || code,
            code,
            name: issuerName || securityId || code,
            isin,
            exchange: "BSE",
            instrumentKey: `BSE_EQ|${isin}`
          });
          bseByCode.set(code, item);
          if (securityId) {
            bseById.set(securityId, item);
          }
          if (!isinMap.has(isin)) isinMap.set(isin, item);
        }
      }
    } catch (err) {
      console.warn("Failed to parse bse_equity.csv:", err.message);
    }
  }

  universeCache = {
    nseBySymbol,
    bseByCode,
    bseById,
    isinMap,
    nseCount: nseBySymbol.size,
    bseCount: bseByCode.size
  };

  return universeCache;
}

export function resolveUniverseInstrument(symbolOrKey, options = {}) {
  if (!symbolOrKey) {
    throw new Error("Stock symbol is required. Example: npm run analyze -- TCS");
  }

  // Raw Upstox instrument key: e.g. NSE_EQ|INE467B01029 or BSE_EQ|INE002A01018
  if (symbolOrKey.includes("|")) {
    const parts = symbolOrKey.split("|");
    const exchange = parts[0].startsWith("BSE") ? "BSE" : "NSE";
    return {
      symbol: symbolOrKey,
      name: symbolOrKey,
      instrumentKey: symbolOrKey,
      exchange
    };
  }

  let query = symbolOrKey.trim().toUpperCase();
  let requestedExchange = options.exchange?.toUpperCase() || null;

  if (query.startsWith("NSE:")) {
    requestedExchange = "NSE";
    query = query.slice(4).trim();
  } else if (query.startsWith("BSE:")) {
    requestedExchange = "BSE";
    query = query.slice(4).trim();
  }

  // Apply symbol alias if any
  const normalizedSymbol = DEFAULT_ALIASES[query] ?? query;

  // Custom instruments override passed via options
  if (options.instruments && options.instruments[normalizedSymbol]) {
    return { symbol: normalizedSymbol, ...options.instruments[normalizedSymbol] };
  }

  const universe = getUniverse(options);

  // If explicit BSE requested or query is a numeric BSE scrip code (e.g. 500325)
  if (requestedExchange === "BSE" || /^\d{5,6}$/.test(normalizedSymbol)) {
    if (universe.bseByCode.has(normalizedSymbol)) {
      return universe.bseByCode.get(normalizedSymbol);
    }
    if (universe.bseById.has(normalizedSymbol)) {
      return universe.bseById.get(normalizedSymbol);
    }
  }

  // If explicit NSE requested or default search order: NSE first
  if (requestedExchange !== "BSE") {
    if (universe.nseBySymbol.has(normalizedSymbol)) {
      const item = universe.nseBySymbol.get(normalizedSymbol);
      if (NAME_OVERRIDES[normalizedSymbol]) {
        return { ...item, name: NAME_OVERRIDES[normalizedSymbol] };
      }
      return item;
    }
  }

  // If not found in NSE, check BSE by Security ID or Code
  if (universe.bseById.has(normalizedSymbol)) {
    return universe.bseById.get(normalizedSymbol);
  }
  if (universe.bseByCode.has(normalizedSymbol)) {
    return universe.bseByCode.get(normalizedSymbol);
  }

  // Check ISIN map directly if query looks like an ISIN (INE... / INF...)
  if (/^IN[A-Z0-9]{10}$/.test(normalizedSymbol)) {
    if (universe.isinMap.has(normalizedSymbol)) {
      return universe.isinMap.get(normalizedSymbol);
    }
    const exch = requestedExchange === "BSE" ? "BSE" : "NSE";
    return {
      symbol: normalizedSymbol,
      name: normalizedSymbol,
      isin: normalizedSymbol,
      exchange: exch,
      instrumentKey: `${exch}_EQ|${normalizedSymbol}`
    };
  }

  // Fallback to defaultInstruments if provided
  if (options.defaultInstruments && options.defaultInstruments[normalizedSymbol]) {
    return { symbol: normalizedSymbol, ...options.defaultInstruments[normalizedSymbol] };
  }


  throw new Error(
    `Unknown stock symbol: ${symbolOrKey}. Could not find it in NSE (${universe.nseCount} symbols) or BSE (${universe.bseCount} symbols). Please verify the ticker or provide an Upstox instrument key (e.g. NSE_EQ|INE467B01029).`
  );
}
