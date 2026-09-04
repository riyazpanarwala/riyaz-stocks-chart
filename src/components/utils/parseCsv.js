import React, { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";
import { useFOSymbols } from "./parseFO";
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
  const [nseData, setNseData] = useState([]);
  const [bseData, setBseData] = useState([]);
  const [etfData, setEtfData] = useState([]);
  const [companyObj, setCompany] = useState(() => resolveInitialCompany(cachedMergedArr));
  const [companyArr, setCompanyArr] = useState(() => cachedMergedArr || []);
  const [isFO, setFO] = useState(false);
  const { readRemoteFile } = usePapaParse();
  const { isFOSymbol, isFOLoading } = useFOSymbols();

  const mergeArrays = (arr1, arr2, etfArr) => {
    const merged = [];

    // Map ISIN to BSE items for O(1) lookup
    const bseMap = new Map();
    arr2.forEach((item2, j) => {
      if (j > 0 && item2 && item2.length >= 8) {
        bseMap.set(item2[7], item2);
      }
    });

    const nseIsinSet = new Set();

    // Add NSE + BSE equities
    arr1.forEach((item, i) => {
      if (i > 0) {
        const isin = item[6];
        const label = String(item[1] || "").trim();
        const symbol = String(item[0] || "").trim();
        if (isin) nseIsinSet.add(isin);
        merged.push({
          label,
          value: isin,
          symbol,
          nse: true,
          bse: bseMap.has(isin),
          _lowerLabel: label.toLowerCase(),
          _lowerSymbol: symbol.toLowerCase(),
        });
      }
    });

    arr2.forEach((item2, j) => {
      if (j === 0) return;
      if (!item2 || item2.length < 8) return;
      const isin = item2[7];
      if (!nseIsinSet.has(isin)) {
        const label = String(item2[1] || "").trim();
        const symbol = String(item2[2] || "").trim();
        merged.push({
          label,
          value: isin,
          symbol,
          nse: false,
          bse: true,
          _lowerLabel: label.toLowerCase(),
          _lowerSymbol: symbol.toLowerCase(),
        });
      }
    });

    // Add NSE Indices
    indicesArr.forEach((v) => {
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

    globalInstruments.forEach((v) => {
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
    bseIndicesArr.forEach((v) => {
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

    // Add ETFs parsed from CSV
    etfArr.forEach((etf) => {
      const label = String(etf.label || "").trim();
      const symbol = String(etf.symbol || "").trim();
      merged.push({
        ...etf,
        _lowerLabel: label.toLowerCase(),
        _lowerSymbol: symbol.toLowerCase(),
      });
    });

    return merged;
  };

  useEffect(() => {
    if (cachedMergedArr) {
      if (!companyArr.length) {
        setCompanyArr(cachedMergedArr);
        setCompany((prev) => (prev?.symbol ? prev : resolveInitialCompany(cachedMergedArr)));
      }
      return;
    }
    if (nseData.length && bseData.length && etfData.length) {
      const merged = mergeArrays(nseData, bseData, etfData);
      cachedMergedArr = merged;
      setCompanyArr(merged);
      setCompany((prev) => (prev?.symbol ? prev : resolveInitialCompany(merged)));
    }
  }, [nseData, bseData, etfData]);

  useEffect(() => {
    if (cachedMergedArr) return;

    // Parse NSE equities
    readRemoteFile("/nse_equity.csv", {
      complete: (results) => {
        setNseData(results.data);
      },
    });

    // Parse BSE equities
    readRemoteFile("/bse_equity.csv", {
      complete: (results) => {
        setBseData(results.data);
      },
    });

    // Parse ETF list
    // NSE eq_etfseclist.csv columns (header row):
    // SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
    readRemoteFile("/eq_etfseclist.csv", {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
      complete: (results) => {
        if (!results.data?.length) return;

        const parsed = results.data
          .filter((row) => {
            const symbol = row["Symbol"];
            const isin = row["ISINNumber"];
            return symbol && isin;
          })
          .map((row) => {
            const symbol = (row["Symbol"] || "").trim();
            const name = (row["SecurityName"] || row["NAME OF COMPANY"] || row["Symbol"] || "").trim();
            const isin = (row["ISINNumber"] || "").trim();

            return {
              label: name,
              value: isin,
              symbol,
              nse: true,
              bse: false,
              etf: true,             // ← new flag
              indexName: "NSE_EQ",   // ETFs trade on NSE as equities
            };
          })
          .filter((item) => item.symbol && item.value);

        setEtfData(parsed);
      },
    });
  }, []);

  useEffect(() => {
    if (!isFOLoading) {
      const symbol = foMapData[companyObj.symbol] ?? companyObj.symbol;
      setFO(isFOSymbol(symbol));
    }
  }, [companyObj.symbol, isFOLoading]);

  return {
    isFO,
    companyArr,
    companyObj,
    setCompany,
  };
};

export default useParseCsv;
