import { resolveUniverseInstrument } from "./stocksUniverse.js";

export const QUICK_ANALYSIS_DEFAULTS = Object.freeze({
  timeframe: "1d",
  lookbackCalendarDays: 730,
  includeLiveCandle: true,
  liveIntervalMinutes: 1,
  positionState: "FLAT",
  requestsPerSecond: 10
});

export const DEFAULT_INSTRUMENTS = Object.freeze({
  BEL: { name: "Bharat Electronics Limited", instrumentKey: "NSE_EQ|INE263A01024" },
  BHARTIARTL: { name: "Bharti Airtel Limited", instrumentKey: "NSE_EQ|INE397D01024" },
  HDFCBANK: { name: "HDFC Bank Limited", instrumentKey: "NSE_EQ|INE040A01034" },
  ICICIBANK: { name: "ICICI Bank Limited", instrumentKey: "NSE_EQ|INE090A01021" },
  INFY: { name: "Infosys Limited", instrumentKey: "NSE_EQ|INE009A01021" },
  ITC: { name: "ITC Limited", instrumentKey: "NSE_EQ|INE154A01025" },
  JPPOWER: { name: "Jaiprakash Power Ventures Limited", instrumentKey: "NSE_EQ|INE351F01018" },
  LT: { name: "Larsen & Toubro Limited", instrumentKey: "NSE_EQ|INE018A01030" },
  MARUTI: { name: "Maruti Suzuki India Limited", instrumentKey: "NSE_EQ|INE585B01010" },
  NEXT50BETA: { name: "UTI Nifty Next 50 ETF", instrumentKey: "NSE_EQ|INF789F1AUW9" },
  NIFTYBEES: { name: "Nippon India ETF Nifty 50 BeES", instrumentKey: "NSE_EQ|INF204KB14I2" },
  NTPC: { name: "NTPC Limited", instrumentKey: "NSE_EQ|INE733E01010" },
  POWERGRID: { name: "Power Grid Corporation of India Limited", instrumentKey: "NSE_EQ|INE752E01010" },
  RELIANCE: { name: "Reliance Industries Limited", instrumentKey: "NSE_EQ|INE002A01018" },
  SBIN: { name: "State Bank of India", instrumentKey: "NSE_EQ|INE062A01020" },
  SUNPHARMA: { name: "Sun Pharmaceutical Industries Limited", instrumentKey: "NSE_EQ|INE044A01036" },
  SUZLON: { name: "Suzlon Energy Limited", instrumentKey: "NSE_EQ|INE040H01021" },
  TATASTEEL: { name: "Tata Steel Limited", instrumentKey: "NSE_EQ|INE081A01020" },
  TCS: { name: "Tata Consultancy Services Limited", instrumentKey: "NSE_EQ|INE467B01029" }
});

export const DEFAULT_INSTRUMENT_ALIASES = Object.freeze({
  "UTI NIFTY NEXT 50": "NEXT50BETA",
  "UTI NIFTY NEXT 50 ETF": "NEXT50BETA",
  UTINEXT50: "NEXT50BETA",
  ZOMATO: "ETERNAL",
  TATAMOTORS: "TMPV"
});


export function resolveInstrument(symbolOrKey, instruments = DEFAULT_INSTRUMENTS, options = {}) {
  if (!symbolOrKey) throw new Error("Stock symbol is required. Example: npm run analyze -- TCS");
  if (symbolOrKey.includes("|")) return { symbol: symbolOrKey, name: symbolOrKey, instrumentKey: symbolOrKey };
  const requestedSymbol = symbolOrKey.trim().toUpperCase();
  const symbol = DEFAULT_INSTRUMENT_ALIASES[requestedSymbol] ?? requestedSymbol;

  // Check custom instrument override or exact match in instruments
  if (instruments && instruments !== DEFAULT_INSTRUMENTS && instruments[symbol]) {
    return { symbol, ...instruments[symbol] };
  }
  if (instruments && instruments[symbol]) {
    return { symbol, ...instruments[symbol] };
  }

  // If a custom instrument map was explicitly provided (and not DEFAULT_INSTRUMENTS),
  // honor strict matching for test assertions that check custom instrument sets
  if (instruments && instruments !== DEFAULT_INSTRUMENTS && !options.useUniverse) {
    throw new Error(`Unknown symbol: ${symbol}. Add it to DEFAULT_INSTRUMENTS or pass an Upstox instrument key.`);
  }

  // Fallback to the full NSE & BSE stock universe (2,500+ NSE and 4,900+ BSE stocks)
  return resolveUniverseInstrument(symbolOrKey, {
    ...options,
    instruments,
    defaultInstruments: DEFAULT_INSTRUMENTS
  });
}


