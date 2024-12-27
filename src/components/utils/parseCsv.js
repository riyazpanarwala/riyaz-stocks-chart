import React, { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";

const useParseCsv = () => {
  const [companyObj, setCompany] = useState({});
  const [companyArr, setCompanyArr] = useState([]);
  const { readRemoteFile } = usePapaParse();

  useEffect(() => {
    readRemoteFile("/nse_equity.csv", {
      complete: (results) => {
        let companyArr = [];
        let selectedObj = "";
        results.data.forEach((item, i) => {
          if (i > 0) {
            let obj = { label: item[1], value: item[6], symbol: item[0] };
            companyArr = [...companyArr, obj];

            if (item[6] === "INE351F01018") {
              selectedObj = obj;
            }
          }
        });
        setCompany(selectedObj || companyArr[0]);
        setCompanyArr((prevState) => [...prevState, ...companyArr]);
      },
    });

    readRemoteFile("/bse_equity.csv", {
      complete: (results) => {
        let companyArr = [];
        results.data.forEach((item, i) => {
          if (i > 0 && item[7]) {
            let obj = {
              label: item[1] + " (BSE)",
              value: item[7],
              symbol: item[2],
              isBSE: true,
            };
            companyArr = [...companyArr, obj];
          }
        });
        setCompanyArr((prevState) => [...prevState, ...companyArr]);
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
