"use client";
import React, { useEffect, useState } from "react";
import HeaderWithDropdowns from "../components/selectDropdown";
import {
  getHistoricData,
  getIntradayData,
} from "../components/getIntervalData";
import companyArr from "../components/utils/companyArr";
import Tiles from "../components/tiles";
import FinanceChart from "../components/financeChart";

const CandleStickChart = () => {
  const [period, setPeriod] = useState("1m");
  const [companyName, setCompany] = useState(companyArr[0].value);
  const [interval, setInterval] = useState("1minute");
  const [intradayOrHistoric, setIntradayOrHistoric] = useState("intraday");
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);

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
    const index = companyArr.findIndex((v) => v.value === companyName);
    return index !== -1 ? companyArr[index].name : "";
  };

  const isBSE = () => {
    const index = companyArr.findIndex((v) => v.value === companyName);
    return index !== -1 ? companyArr[index].isBSE : false;
  };

  const callHistoricApi = () => {
    getHistoricData(setCandleArr, interval, companyName, isBSE(), period);
  };

  const callIntradayApi = () => {
    getIntradayData(setCandleArr, interval, companyName, isBSE());
  };

  const handleIntervalChange = (e) => {
    setInterval(e.target.value);
  };

  const handleCompanyChange = (e) => {
    setCompany(e.target.value);
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
    if (interval && intradayOrHistoric && apiCall > 0) {
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
  }, [interval, intradayOrHistoric, companyName, period]);

  return (
    <div>
      <HeaderWithDropdowns
        interval={interval}
        intradayOrHistoric={intradayOrHistoric}
        companyName={companyName}
        handleIntervalChange={handleIntervalChange}
        handleIntradayChange={handleIntradayChange}
        handleCompanyChange={handleCompanyChange}
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
        <FinanceChart initialData={candleData} />
      </div>
    </div>
  );
};

export default CandleStickChart;
