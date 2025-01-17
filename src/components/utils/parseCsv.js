import React, { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";

const indicesArr = [
  { name: "NIFTY 50", value: "Nifty 50", symbol: "NIFTY 50" },
  {
    name: "NIFTY MIDCAP 100",
    value: "NIFTY MIDCAP 100",
    symbol: "NIFTY MIDCAP 100",
  },
  {
    name: "NIFTY SMALLCAP 100",
    value: "NIFTY SMALLCAP 100",
    symbol: "NIFTY SMALLCAP 100",
  },
  {
    name: "NIFTY ENERGY",
    value: "NIFTY ENERGY",
    symbol: "NIFTY ENERGY",
  },
];

const useParseCsv = () => {
  const [nseData, setNseData] = useState([]);
  const [bseData, setBseData] = useState([]);
  const [companyObj, setCompany] = useState({});
  const [companyArr, setCompanyArr] = useState([]);
  const { readRemoteFile } = usePapaParse();

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

    arr2.forEach((item2) => {
      if (!arr1.find((item) => item[6] === item2[7])) {
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
        index: true,
      };

      if (v.value === "Nifty 50") {
        setCompany(niftyObj);
      }

      merged.push(niftyObj);
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

  return {
    companyArr,
    companyObj,
    setCompany,
  };
};

export default useParseCsv;
