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
];

const bseIndicesArr = [
  { name: "SENSEX", value: "SENSEX", symbol: "SENSEX", yahooSymbol: "^BSESN" },
];

const useParseCsv = () => {
  const [nseData, setNseData] = useState([]);
  const [bseData, setBseData] = useState([]);
  const [etfData, setEtfData] = useState([]);
  const [companyObj, setCompany] = useState({});
  const [companyArr, setCompanyArr] = useState([]);
  const [isFO, setFO] = useState(false);
  const { readRemoteFile } = usePapaParse();
  const { isFOSymbol, isFOLoading } = useFOSymbols();

  const mergeArrays = (arr1, arr2, etfArr) => {
    const merged = [];

    // Add NSE + BSE equities
    arr1.forEach((item, i) => {
      if (i > 0) {
        const index = arr2.findIndex((v) => v[7] === item[6]);
        merged.push({
          label: item[1],
          value: item[6],
          symbol: item[0],
          nse: true,
          bse: index !== -1,
        });
      }
    });

    arr2.forEach((item2, j) => {
      if (j === 0) return;
      if (!item2 || item2.length < 8) return;
      const index = arr1.findIndex((v, i) => i > 0 && v[6] === item2[7]);
      if (index === -1) {
        merged.push({
          label: item2[1],
          value: item2[7],
          symbol: item2[2],
          nse: false,
          bse: true,
        });
      }
    });

    // Add NSE Indices
    indicesArr.forEach((v) => {
      const niftyObj = {
        label: v.name,
        value: v.value,
        symbol: v.symbol,
        nse: false,
        bse: false,
        nseIndex: true,
        yahooSymbol: v.yahooSymbol,
      };

      if (v.symbol === "NIFTY 50") {
        setCompany(niftyObj);
      }

      merged.push(niftyObj);
    });

    // Add BSE Indices
    bseIndicesArr.forEach((v) => {
      merged.push({
        label: v.name,
        value: v.value,
        symbol: v.symbol,
        bseIndex: true,
        yahooSymbol: v.yahooSymbol,
      });
    });

    // Add ETFs parsed from CSV
    etfArr.forEach((etf) => {
      merged.push(etf);
    });

    return merged;
  };

  useEffect(() => {
    if (nseData.length && bseData.length && etfData.length) {
      setCompanyArr(mergeArrays(nseData, bseData, etfData));
    }
  }, [nseData, bseData, etfData]);

  useEffect(() => {
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
            const symbol = (
              row["Symbol"] || ""
            ).trim();
            const name = (
              row["SecurityName"]
            ).trim();
            const isin = (
              row["ISINNumber"] || ""
            ).trim();

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
