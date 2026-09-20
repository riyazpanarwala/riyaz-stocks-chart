import { useEffect, useState } from "react";
import foMapData from "./FOmap.js";

const indicesArr = [
  {
    name: "NIFTY 50",
    value: "Nifty 50",
    symbol: "NIFTY 50",
    yahooSymbol: "^NSEI",
  },
  {
    name: "NIFTY BANK",
    value: "Nifty Bank",
    symbol: "NIFTY BANK",
    yahooSymbol: "^NSEBANK",
  },
  {
    name: "NIFTY MIDCAP 100",
    value: "NIFTY MIDCAP 100",
    symbol: "NIFTY MIDCAP 100",
    yahooSymbol: "NIFTY_MIDCAP_100.NS",
  },
  {
    name: "NIFTY SMALLCAP 100",
    value: "NIFTY SMLCAP 100",
    symbol: "NIFTY SMALLCAP 100",
  },
  {
    name: "NIFTY ENERGY",
    value: "Nifty Energy",
    symbol: "NIFTY ENERGY",
    yahooSymbol: "^CNXENERGY",
  },
  {
    name: "INDIA VIX",
    value: "India VIX",
    symbol: "India VIX",
    upstoxOnly: true,
  },
];

const globalInstruments = [
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

const bseIndicesArr = [
  { name: "SENSEX", value: "SENSEX", symbol: "SENSEX", yahooSymbol: "^BSESN" },
];

let cachedMergedArr = null;
let cachedFoSet = null;

/**
 * Updates the browser address bar with the selected symbol query parameter.
 * @param {string} symbol - The stock or instrument symbol to reflect in the URL.
 */
const updateUrlSymbol = (symbol) => {
  if (typeof window === "undefined" || !symbol) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("symbol") !== symbol) {
      url.searchParams.set("symbol", symbol);
      window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
    }
  } catch (err) {
    console.error("Failed to update URL symbol:", err);
  }
};

/**
 * Resolves the initial company from URL search parameters or falls back to NIFTY 50.
 * @param {Array<Object>} merged - The merged list of stocks, ETFs, and indices.
 * @returns {Object} The resolved company object.
 */
const resolveInitialCompany = (merged) => {
  if (!merged || !merged.length) return {};
  let selectedFromUrl = null;
  let niftyFallback = null;

  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const symbolParam = (urlParams.get("symbol") || urlParams.get("q") || "").trim().toUpperCase();
    if (symbolParam) {
      selectedFromUrl = merged.find(
        (item) =>
          (item.symbol && item.symbol.toUpperCase() === symbolParam) ||
          (item.label && item.label.toUpperCase() === symbolParam) ||
          (item.value && item.value.toUpperCase() === symbolParam)
      );
    }
  }

  niftyFallback = merged.find((item) => item.symbol === "NIFTY 50");
  return selectedFromUrl || niftyFallback || merged[0];
};

const useParseCsv = () => {
  const [companyObj, setCompany] = useState(() => resolveInitialCompany(cachedMergedArr));
  const [companyArr, setCompanyArr] = useState(() => cachedMergedArr || []);
  const [isFO, setFO] = useState(false);
  const [isLoading, setIsLoading] = useState(!cachedMergedArr);

  useEffect(() => {
    if (cachedMergedArr) {
      if (!companyArr.length) {
        setCompanyArr(cachedMergedArr);
        setCompany((prev) => (prev?.symbol ? prev : resolveInitialCompany(cachedMergedArr)));
      }
      return;
    }

    let isMounted = true;

    async function loadInstruments() {
      try {
        const res = await fetch("/api/instruments");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data && Array.isArray(data.instruments)) {
          const merged = data.instruments;
          cachedMergedArr = merged;
          if (data.foSymbols && Array.isArray(data.foSymbols)) {
            cachedFoSet = new Set(data.foSymbols);
          }

          if (isMounted) {
            setCompanyArr(merged);
            setCompany((prev) => (prev?.symbol ? prev : resolveInitialCompany(merged)));
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to load /api/instruments:", err);
      }
    }

    loadInstruments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (companyObj && companyObj.symbol) {
      const sym = foMapData[companyObj.symbol] ?? companyObj.symbol;
      if (cachedFoSet) {
        setFO(cachedFoSet.has(sym));
      }
    }
  }, [companyObj?.symbol, companyArr]);

  // Keep URL query param in sync with currently selected stock
  useEffect(() => {
    if (companyObj && companyObj.symbol && typeof window !== "undefined") {
      updateUrlSymbol(companyObj.symbol);
    }
  }, [companyObj]);

  // Sync state if user navigates with browser back / forward buttons
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      if (!companyArr.length) return;
      const urlParams = new URLSearchParams(window.location.search);
      const symbolParam = (urlParams.get("symbol") || urlParams.get("q") || "").trim().toUpperCase();
      if (symbolParam) {
        const found = companyArr.find(
          (item) =>
            (item.symbol && item.symbol.toUpperCase() === symbolParam) ||
            (item.label && item.label.toUpperCase() === symbolParam) ||
            (item.value && item.value.toUpperCase() === symbolParam)
        );
        if (found && found.symbol !== companyObj?.symbol) {
          setCompany(found);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [companyArr, companyObj]);

  return {
    isFO,
    companyArr,
    companyObj,
    setCompany,
    isLoading,
  };
};

export default useParseCsv;
