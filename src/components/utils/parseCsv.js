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
  const [companyObj, setCompany] = useState({});
  const [companyArr, setCompanyArr] = useState([]);
  const [isFO, setFO] = useState(false);
  const { readRemoteFile } = usePapaParse();
  const { isFOSymbol, isFOLoading } = useFOSymbols();

  const mergeArrays = (arr1, arr2) => {
    const merged = [];

    arr1.forEach((item, i) => {
      if (i > 0) {
        const index = arr2.findIndex((v) => v[7] === item[6]);
        let obj = {
          label: item[1],
          value: item[6],
          symbol: item[0],
          nse: true,
          bse: index !== -1,
        };

        merged.push(obj);
      }
    });

    arr2.forEach((item2, j) => {
      if (j === 0) return; // skip header
      if (!item2 || item2.length < 8) return; // guard malformed rows
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

    indicesArr.forEach((v) => {
      let niftyObj = {
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

    bseIndicesArr.forEach((v) => {
      let obj = {
        label: v.name,
        value: v.value,
        symbol: v.symbol,
        bseIndex: true,
        yahooSymbol: v.yahooSymbol,
      };

      merged.push(obj);
    });

    return merged;
  };

  useEffect(() => {
    if (nseData.length && bseData.length) {
      setCompanyArr(mergeArrays(nseData, bseData));
    }
  }, [nseData, bseData]);

  useEffect(() => {
    readRemoteFile("/nse_equity.csv", {
      complete: (results) => {
        setNseData(results.data);
      },
    });

    readRemoteFile("/bse_equity.csv", {
      complete: (results) => {
        setBseData(results.data);
      },
    });
  }, []);

  useEffect(() => {
    if (!isFOLoading) {
      let symbol = foMapData[companyObj.symbol] ?? companyObj.symbol;
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
