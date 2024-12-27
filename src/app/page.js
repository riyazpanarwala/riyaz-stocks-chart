"use client";
import React, { useEffect, useState } from "react";
import HeaderWithDropdowns from "../components/selectDropdown";
import {
  getHistoricData,
  getIntradayData,
} from "../components/getIntervalData";
import Tiles from "../components/tiles";
import FinanceChart from "../components/financeChart";
import useParseCsv from "../components/utils/parseCsv";

const CandleStickChart = () => {
  const [period, setPeriod] = useState("1m");
  const [interval, setInterval] = useState("1minute");
  const [intradayOrHistoric, setIntradayOrHistoric] = useState("intraday");
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const { companyArr, companyObj, setCompany } = useParseCsv();

  const setCandleArr = (arr) => {
    let dataArr = [];
    let candles = arr.data.candles.reverse();

    candles.forEach((item, i) => {
      const aa = item[0].split("T");
      const hhmmss = aa[1].split("+")[0];
      dataArr = [
        ...dataArr,
        {
          date: `${aa[0]} ${hhmmss}`,
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5],
        },
      ];
    });

    setCandleData(dataArr);
  };

  const getCompanyName = () => {
    return companyObj?.label;
  };

  const isBSE = () => {
    return companyObj?.isBSE;
  };

  const callHistoricApi = () => {
    getHistoricData(setCandleArr, interval, companyObj.value, isBSE(), period);
  };

  const callIntradayApi = () => {
    getIntradayData(setCandleArr, interval, companyObj.value, isBSE());
  };

  const handleIntervalChange = (e) => {
    setInterval(e.target.value);
  };

  const handleCompanyChange = (companyObj) => {
    setCompany(companyObj);
  };

  const handleIntradayChange = (e) => {
    const val = e.target.value;
    if (val === "intraday") {
      setInterval("1minute");
    } else {
      setInterval("30minute");
    }
    setIntradayOrHistoric(val);
  };

  useEffect(() => {
    if (interval && intradayOrHistoric && companyObj.value && apiCall > 0) {
      setCandleData([]);
      if (intradayOrHistoric === "intraday") {
        callIntradayApi();
      } else {
        callHistoricApi();
      }
    }
  }, [apiCall]);

  useEffect(() => {
    setApiCall((prevState) => prevState + 1);
  }, [interval, intradayOrHistoric, companyObj, period]);

  if (!companyArr.length) {
    return "please wait";
  }

  return (
    <div>
      <HeaderWithDropdowns
        interval={interval}
        intradayOrHistoric={intradayOrHistoric}
        companyObj={companyObj}
        handleIntervalChange={handleIntervalChange}
        handleIntradayChange={handleIntradayChange}
        handleCompanyChange={handleCompanyChange}
        companyArr={companyArr}
      />
      <div style={{ margin: "20px" }}>
        {intradayOrHistoric === "historical" && (
          <Tiles
            selectedPeriod={period}
            setSelectedPeriod={(val) => {
              setPeriod(val);
            }}
          />
        )}
        <h1>{getCompanyName()}</h1>
        {candleData.length && <FinanceChart initialData={candleData} />}
      </div>
    </div>
  );
};

export default CandleStickChart;
