import React, { useEffect, useState } from "react";
import { usePapaParse } from "react-papaparse";

const useParseCsv = () => {
  const [companyObj, setCompany] = useState({});
  const [companyArr, setCompanyArr] = useState([]);
  const { readRemoteFile } = usePapaParse();

  useEffect(() => {
    let companyArr = [];
    readRemoteFile("/EQUITY_L.csv", {
      complete: (results) => {
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
        setCompanyArr(companyArr);
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
