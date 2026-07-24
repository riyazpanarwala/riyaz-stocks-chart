/**
 * Utility to resolve TradingView compatible symbols for stocks, indices, and global instruments.
 * Returns null if no valid TradingView symbol exists, signaling components to hide the widget.
 */

const GLOBAL_TRADINGVIEW_MAP = {
  // Global Indices
  "SGX NIFTY": "NSE:NIFTY1!",
  "GIFT NIFTY": "NSE:NIFTY1!",
  "^DJI": "TVC:DJI",
  "DOW JONES": "TVC:DJI",
  "DOW FUTURES": "CAPITALCOM:US30",
  "US 30": "CAPITALCOM:US30",
  "^GSPC": "TVC:SPX",
  "S&P 500": "TVC:SPX",
  "S&P": "TVC:SPX",
  "IXIX": "NASDAQ:NDX",
  "US Tech 100": "NASDAQ:NDX",
  "^FTSE": "TVC:UKX",
  "FTSE 100": "TVC:UKX",
  "^GDAXI": "TVC:DEU40",
  "DAX": "TVC:DEU40",
  "^FCHI": "TVC:FRA40",
  "CAC 40": "TVC:FRA40",
  "^HSI": "TVC:HSI",
  "HANG SENG": "TVC:HSI",
  "^N225": "TVC:NI225",
  "NIKKEI 225": "TVC:NI225",

  // Global Indicators
  "USDINR": "FX_IDC:USDINR",
  "USD/INR": "FX_IDC:USDINR",
  "BZUSD": "TVC:UKOIL",
  "Oil (Brent)": "TVC:UKOIL",
  "CLUSD": "TVC:USOIL",
  "Oil (WTI)": "TVC:USOIL",
};

const NSE_INDEX_MAP = {
  "Nifty 50": "NSE:NIFTY",
  "NIFTY 50": "NSE:NIFTY",
  "Nifty Bank": "NSE:BANKNIFTY",
  "NIFTY BANK": "NSE:BANKNIFTY",
  "NIFTY MIDCAP 100": "NSE:NIFTY_MIDCAP_100",
  "NIFTY SMLCAP 100": "NSE:NIFTY_SMALLCAP_100",
  "NIFTY ENERGY": "NSE:CNXENERGY",
  "India VIX": "NSE:INDIAVIX",
};

export const getTradingViewSymbol = (item) => {
  if (!item) return null;

  if (typeof item === "string") {
    const cleanStr = item.trim();
    if (GLOBAL_TRADINGVIEW_MAP[cleanStr]) {
      return GLOBAL_TRADINGVIEW_MAP[cleanStr];
    }
    if (NSE_INDEX_MAP[cleanStr]) {
      return NSE_INDEX_MAP[cleanStr];
    }
    if (cleanStr.includes(":")) {
      return cleanStr;
    }
    if (cleanStr.includes("|")) {
      const parts = cleanStr.split("|");
      const keyName = parts[1];
      if (GLOBAL_TRADINGVIEW_MAP[keyName]) {
        return GLOBAL_TRADINGVIEW_MAP[keyName];
      }
      return null;
    }
    return `NSE:${cleanStr}`;
  }

  const { symbol, value, label, global, nseIndex, bseIndex, bse, nse } = item;

  if (global) {
    return (
      GLOBAL_TRADINGVIEW_MAP[value] ||
      GLOBAL_TRADINGVIEW_MAP[symbol] ||
      GLOBAL_TRADINGVIEW_MAP[label] ||
      null
    );
  }

  if (nseIndex) {
    return (
      NSE_INDEX_MAP[label] ||
      NSE_INDEX_MAP[symbol] ||
      NSE_INDEX_MAP[value] ||
      `NSE:${symbol}`
    );
  }

  if (bseIndex || label === "SENSEX" || symbol === "SENSEX") {
    return "BSE:SENSEX";
  }

  if (nse) {
    return `NSE:${symbol}`;
  }

  if (bse) {
    return `BSE:${symbol}`;
  }

  const candidate = symbol || value || label;
  if (!candidate) return null;
  return GLOBAL_TRADINGVIEW_MAP[candidate] || `NSE:${candidate}`;
};
